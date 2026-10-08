import type { User } from '@prisma/client';
import { sha256, saltedCommitment } from '@/lib/hash';
import { ApiError } from './errors';
import { serializable, lockCitizen } from './transaction';
import { requireEligibility } from './verification';
import { appendAudit } from './audit';
export async function signPlatform(
  user: User,
  input: { platformId: string; version: number; textHash: string },
) {
  return serializable(async (tx) => {
    await lockCitizen(tx, user.id);
    await requireEligibility(tx, user.id);
    const platform = await tx.candidatePlatform.findUnique({ where: { id: input.platformId }, include: { candidate: true } });
    if (!platform) throw new ApiError(404, 'Platform was not found');
    if (
      platform.version !== input.version ||
      platform.contentHash !== input.textHash ||
      sha256(platform.content) !== input.textHash
    )
      throw new ApiError(409, 'Platform changed; review its current content');
    const key = {
      userId: user.id,
      documentId: `platform:${platform.id}`,
      version: platform.version,
    };
    const existing = await tx.voterAgreement.findUnique({
      where: { userId_documentId_version: key },
    });
    if (!existing) {
      await tx.voterAgreement.create({
        data: {
          ...key,
          textHash: input.textHash,
          signatureHash: saltedCommitment(
            `platform:${user.voterKey}:${platform.id}:${input.textHash}`,
          ),
        },
      });
      await appendAudit(
        tx,
        JSON.stringify({
          action: 'PLATFORM_SIGN',
          subject: user.id,
          platformId: platform.id,
          textHash: input.textHash,
        }),
        platform.candidate.electionId,
      );
    }
    return { signed: true, platformId: platform.id, version: platform.version };
  });
}
