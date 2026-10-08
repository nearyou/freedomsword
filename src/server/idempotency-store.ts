import type { Prisma, VoteEvent } from '@prisma/client';

/** The unique (voteId, requestId) ledger key makes this store safe across instances. */
export interface VoteIdempotencyStore {
  find(tx: Prisma.TransactionClient, voteId: string, requestId: string): Promise<VoteEvent | null>;
}
export class PostgresVoteIdempotencyStore implements VoteIdempotencyStore {
  find(tx: Prisma.TransactionClient, voteId: string, requestId: string) {
    return tx.voteEvent.findUnique({ where: { voteId_requestId: { voteId, requestId } } });
  }
}
export const voteIdempotencyStore: VoteIdempotencyStore = new PostgresVoteIdempotencyStore();
