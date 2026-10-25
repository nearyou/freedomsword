import { requireUser } from '@backend/auth';
import { handle, json } from '@backend/http';
import { db } from '@backend/db';
import { AGREEMENT_TEXT, AGREEMENT_VERSION } from '@backend/core/agreement';
import { sha256 } from '@backend/core/hash';
import { privateBallotPseudonyms } from '@backend/credentials';
import { activeVerificationProvider } from '@backend/verification';
export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);
    const verification = await db.voterVerification.findUnique({
      where: { userId_provider: { userId: user.id, provider: activeVerificationProvider().name } },
    });
    const agreements = await db.voterAgreement.findMany({
      where: { userId: user.id },
      select: { documentId: true, version: true, textHash: true },
    });
    const elections = await db.election.findMany({
      select: { id: true, protocol: true },
    });
    const lookups = await db.$transaction((tx) =>
      privateBallotPseudonyms(
        tx,
        user,
        elections.filter((e) => e.protocol !== 'MACI_PRIVATE').map((e) => e.id),
      ),
    );
    const votes = await db.vote.findMany({
      where: {
        OR: lookups,
      },
      select: {
        electionId: true,
        candidateId: true,
        balance: true,
        createdAt: true,
        _count: { select: { events: { where: { type: 'RECALL' } } } },
        events: {
          where: { type: 'RECALL' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    const privateRegistrations = await db.privateRegistration.findMany({
      where: { userId: user.id },
      select: { electionId: true, publicKeyX: true, publicKeyY: true,
        signupTxHash: true, stateIndex: true },
    });
    return json({
      connected: true,
      verified: !!verification?.verified && verification.expiresAt > new Date(),
      provider: activeVerificationProvider().name,
      agreementSigned: agreements.some(
        (a) =>
          a.documentId === 'citizen' &&
          a.version === AGREEMENT_VERSION &&
          a.textHash === sha256(AGREEMENT_TEXT),
      ),
      signedPlatforms: agreements
        .filter((a) => a.documentId.startsWith('platform:'))
        .map((a) => a.documentId.slice(9)),
      votes: votes.map((vote) => ({
        electionId: vote.electionId,
        candidateId: vote.candidateId,
        balance: vote.balance,
        castAt: vote.createdAt.toISOString(),
        recallCount: vote._count.events,
        lastRecallAt: vote.events[0]?.createdAt.toISOString() ?? null,
      })),
      privateRegistrations,
    });
  });
}
