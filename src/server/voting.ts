import type { Prisma, User } from '@prisma/client';
import { sha256 } from '@/lib/hash';
import { VOTE_UNITS } from '@/lib/rules';
import { ApiError } from './errors';
import { credentialPseudonym, issueVotingCredential } from './credentials';
import { serializable, lockCitizen } from './transaction';
import { requireEligibility } from './verification';
import { appendAudit } from './audit';
import { effectiveElectionStatus } from '@/lib/lifecycle';
import { databaseNow } from './database-time';
import { permittedRecallAmount } from './recall-policy';
import { voteIdempotencyStore } from './idempotency-store';
export async function requireOpenElection(tx: Prisma.TransactionClient, electionId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Election" WHERE "id" = ${electionId} FOR UPDATE`;
  const election = await tx.election.findUnique({ where: { id: electionId } });
  if (!election) throw new ApiError(409, 'This election is not open');
  const now = await databaseNow(tx);
  const status = effectiveElectionStatus(election, now);
  if (status !== election.status)
    await tx.election.update({ where: { id: election.id }, data: { status } });
  if (status !== 'ACTIVE')
    throw new ApiError(409, 'This election is not open');
  return election;
}
async function assertWindowAtFinalCheck(tx: Prisma.TransactionClient, electionId: string) {
  const [{ allowed }] = await tx.$queryRaw<{ allowed: boolean }[]>`
    SELECT "status" = 'ACTIVE' AND (clock_timestamp() AT TIME ZONE 'UTC') >= "opensAt"
      AND (clock_timestamp() AT TIME ZONE 'UTC') < "closesAt" AS allowed
    FROM "Election" WHERE "id" = ${electionId}`;
  if (!allowed) throw new ApiError(409, 'Election window ended during this request');
}
export async function castVote(
  user: User,
  input: { electionId: string; candidateId: string; requestId: string },
) {
  const requestHash = sha256(JSON.stringify({ type: 'CAST', ...input }));
  return serializable(async (tx) => {
    await lockCitizen(tx, user.id);
    await requireEligibility(tx, user.id);
    await requireOpenElection(tx, input.electionId);
    const candidate = await tx.candidate.findUnique({ where: { id: input.candidateId } });
    if (!candidate || candidate.withdrawn || candidate.electionId !== input.electionId)
      throw new ApiError(400, 'Candidate does not belong to this election');
    const credential = await issueVotingCredential(tx, user, input.electionId);
    const pseudonym = credentialPseudonym(credential, input.electionId);
    const existing = await tx.vote.findUnique({
      where: { electionId_pseudonym: { electionId: input.electionId, pseudonym } },
    });
    if (existing) {
      const previous = await voteIdempotencyStore.find(tx, existing.id, input.requestId);
      if (previous?.requestHash === requestHash)
        return { balance: existing.balance, replayed: true };
      throw new ApiError(409, 'You already cast your one ballot in this election');
    }
    const vote = await tx.vote.create({
      data: {
        electionId: input.electionId,
        candidateId: input.candidateId,
        pseudonym,
        balance: VOTE_UNITS,
        events: {
          create: { type: 'CAST', units: VOTE_UNITS, requestId: input.requestId, requestHash },
        },
      },
    });
    await appendAudit(
      tx,
      JSON.stringify({
        action: 'CAST',
        voteId: vote.id,
        candidateId: input.candidateId,
        units: VOTE_UNITS,
      }),
      input.electionId,
    );
    await assertWindowAtFinalCheck(tx, input.electionId);
    return { balance: VOTE_UNITS, replayed: false };
  });
}
export async function recallVote(
  user: User,
  input: { electionId: string; mode: 'partial' | 'full'; requestId: string },
) {
  const requestHash = sha256(JSON.stringify({ type: 'RECALL', ...input }));
  return serializable(async (tx) => {
    await lockCitizen(tx, user.id);
    await requireEligibility(tx, user.id);
    const election = await requireOpenElection(tx, input.electionId);
    const credential = await issueVotingCredential(tx, user, input.electionId);
    const pseudonym = credentialPseudonym(credential, input.electionId);
    const vote = await tx.vote.findUnique({
      where: { electionId_pseudonym: { electionId: input.electionId, pseudonym } },
    });
    if (!vote) throw new ApiError(404, 'You have no ballot in this election');
    await tx.$queryRaw`SELECT "id" FROM "Vote" WHERE "id" = ${vote.id} FOR UPDATE`;
    const replay = await voteIdempotencyStore.find(tx, vote.id, input.requestId);
    if (replay) {
      if (replay.requestHash !== requestHash)
        throw new ApiError(409, 'Request ID was already used for a different action');
      return { balance: vote.balance, recalled: -replay.units, replayed: true };
    }
    const ledger = await tx.voteEvent.aggregate({
      where: { voteId: vote.id },
      _sum: { units: true },
    });
    if (ledger._sum.units !== vote.balance)
      throw new ApiError(409, 'Ballot integrity check failed');
    const prior = await tx.voteEvent.findMany({
      where: { voteId: vote.id, type: 'RECALL' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const amount = permittedRecallAmount(
      election, vote.balance, input.mode, vote.createdAt,
      prior.map((event) => event.createdAt), await databaseNow(tx),
    );
    const updated = await tx.vote.updateMany({
      where: { id: vote.id, balance: vote.balance },
      data: { balance: { decrement: amount } },
    });
    if (updated.count !== 1) throw new ApiError(409, 'Ballot changed; please refresh');
    await tx.voteEvent.create({
      data: {
        voteId: vote.id,
        type: 'RECALL',
        units: -amount,
        requestId: input.requestId,
        requestHash,
      },
    });
    await appendAudit(tx, JSON.stringify({ action: 'RECALL', voteId: vote.id, units: -amount }), input.electionId);
    await assertWindowAtFinalCheck(tx, input.electionId);
    return { balance: vote.balance - amount, recalled: amount, replayed: false };
  });
}
