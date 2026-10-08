import { randomBytes } from 'node:crypto';
import type { Prisma, User, VotingCredential } from '@prisma/client';
import { ballotPseudonym } from '@/lib/hash';
import { secret } from './secrets';

export function credentialPseudonym(
  credential: Pick<VotingCredential, 'token' | 'legacyPseudonym'>,
  electionId: string,
) {
  return (
    credential.legacyPseudonym ??
    ballotPseudonym(credential.token, electionId, secret('BALLOT_SECRET'))
  );
}

export async function issueVotingCredential(
  tx: Prisma.TransactionClient,
  user: User,
  electionId: string,
) {
  const existing = await tx.votingCredential.findUnique({
    where: { userId_electionId: { userId: user.id, electionId } },
  });
  if (existing) return existing;
  // Old ballots keep their immutable pseudonym. Returning users are bound lazily on their next write.
  const oldPseudonym = ballotPseudonym(user.voterKey, electionId, secret('BALLOT_SECRET'));
  const oldBallot = await tx.vote.findUnique({
    where: { electionId_pseudonym: { electionId, pseudonym: oldPseudonym } },
    select: { id: true },
  });
  return tx.votingCredential.create({
    data: {
      userId: user.id,
      electionId,
      token: randomBytes(32).toString('hex'),
      legacyPseudonym: oldBallot ? oldPseudonym : null,
    },
  });
}

export async function privateBallotPseudonyms(
  tx: Prisma.TransactionClient,
  user: User,
  electionIds: string[],
) {
  const credentials = await tx.votingCredential.findMany({
    where: { userId: user.id, electionId: { in: electionIds } },
  });
  return electionIds.map((electionId) => {
    const credential = credentials.find((item) => item.electionId === electionId);
    return {
      electionId,
      pseudonym: credential
        ? credentialPseudonym(credential, electionId)
        : ballotPseudonym(user.voterKey, electionId, secret('BALLOT_SECRET')),
    };
  });
}
