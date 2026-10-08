import { Prisma, type User } from '@prisma/client';
import { saltedCommitment, sha256 } from '@/lib/hash';
import { AGREEMENT_TEXT, AGREEMENT_VERSION } from '@/lib/agreement';
import { serializable, lockCitizen } from './transaction';
import { appendAudit } from './audit';
import { ApiError } from './errors';
import {
  createEligibilityProvider,
  evaluateEligibility,
  subjectCommitment,
  type EligibilityProvider,
} from './eligibility';
export interface VerificationProvider {
  readonly name: string;
  verify(input: {
    subjectKey: string;
  }): Promise<{ verified: boolean; receipt: string; expiresAt: Date }>;
}
export class MockVerificationProvider implements VerificationProvider {
  readonly name = 'MOCK';
  async verify(input: { subjectKey: string }) {
    return {
      verified: true,
      receipt: saltedCommitment(`mock-verification:${input.subjectKey}`),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }
}
export const verificationProvider: VerificationProvider = new MockVerificationProvider();
export const activeVerificationProvider = () => createEligibilityProvider();
export async function requireVerified(tx: Prisma.TransactionClient, userId: string) {
  const verification = await tx.voterVerification.findUnique({
    where: { userId_provider: { userId, provider: activeVerificationProvider().name } },
  });
  if (!verification?.verified || verification.expiresAt <= new Date())
    throw new ApiError(403, 'Complete mock voter verification first');
}
export async function requireEligibility(tx: Prisma.TransactionClient, userId: string) {
  await requireVerified(tx, userId);
  const agreement = await tx.voterAgreement.findUnique({
    where: {
      userId_documentId_version: { userId, documentId: 'citizen', version: AGREEMENT_VERSION },
    },
  });
  if (!agreement || agreement.textHash !== sha256(AGREEMENT_TEXT))
    throw new ApiError(403, 'Sign the current citizen agreement first');
}
export async function verifyCitizen(
  user: User,
  provider: EligibilityProvider = activeVerificationProvider(),
  proof?: unknown,
) {
  const result = await evaluateEligibility(provider, { subjectKey: user.voterKey, proof });
  const commitment = result.uniqueSubjectId
    ? subjectCommitment(provider.name, result.uniqueSubjectId)
    : null;
  const expiresAt = result.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let decision: 'INELIGIBLE' | 'DUPLICATE' | 'SUBJECT_CHANGED' | 'ELIGIBLE';
  try {
    decision = await serializable(async (tx) => {
      await lockCitizen(tx, user.id);
      const previous = await tx.voterVerification.findUnique({
        where: { userId_provider: { userId: user.id, provider: provider.name } },
        select: { subjectCommitment: true },
      });
      const duplicate = commitment
        ? await tx.voterVerification.findUnique({
            where: {
              provider_subjectCommitment: {
                provider: provider.name,
                subjectCommitment: commitment,
              },
            },
            select: { userId: true },
          })
        : null;
      const state = !result.eligible
        ? 'INELIGIBLE'
        : previous?.subjectCommitment && previous.subjectCommitment !== commitment
          ? 'SUBJECT_CHANGED'
          : duplicate && duplicate.userId !== user.id
            ? 'DUPLICATE'
            : 'ELIGIBLE';
      if (state === 'ELIGIBLE') {
        const data = {
          receipt: saltedCommitment(`verification:${provider.name}:${commitment}`),
          subjectCommitment: commitment,
          expiresAt,
          verified: true,
        };
        await tx.voterVerification.upsert({
          where: { userId_provider: { userId: user.id, provider: provider.name } },
          create: { userId: user.id, provider: provider.name, ...data },
          update: data,
        });
      }
      await appendAudit(
        tx,
        JSON.stringify({
          action: 'ELIGIBILITY_DECISION',
          subject: user.id,
          provider: provider.name,
          decision: state,
        }),
      );
      return state;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new ApiError(
        409,
        'Eligibility identity has already been used.',
        'ELIGIBILITY_DUPLICATE',
      );
    throw error;
  }
  if (decision === 'INELIGIBLE')
    throw new ApiError(403, 'Voter is not eligible.', 'ELIGIBILITY_DENIED');
  if (decision === 'DUPLICATE')
    throw new ApiError(409, 'Eligibility identity has already been used.', 'ELIGIBILITY_DUPLICATE');
  if (decision === 'SUBJECT_CHANGED')
    throw new ApiError(
      409,
      'Eligibility identity changed; manual review is required.',
      'ELIGIBILITY_SUBJECT_CHANGED',
    );
  return { verified: true, provider: provider.name, expiresAt };
}
export async function signCitizenAgreement(user: User, textHash: string) {
  if (textHash !== sha256(AGREEMENT_TEXT))
    throw new ApiError(409, 'Agreement changed; review the current version');
  return serializable(async (tx) => {
    await lockCitizen(tx, user.id);
    await requireVerified(tx, user.id);
    const key = { userId: user.id, documentId: 'citizen', version: AGREEMENT_VERSION };
    const existing = await tx.voterAgreement.findUnique({
      where: { userId_documentId_version: key },
    });
    if (!existing) {
      await tx.voterAgreement.create({
        data: {
          ...key,
          textHash,
          signatureHash: saltedCommitment(`agreement:${user.voterKey}:${textHash}`),
        },
      });
      await appendAudit(
        tx,
        JSON.stringify({
          action: 'AGREEMENT',
          subject: user.id,
          textHash,
          version: AGREEMENT_VERSION,
        }),
      );
    }
    return { signed: true, textHash, version: AGREEMENT_VERSION };
  });
}
