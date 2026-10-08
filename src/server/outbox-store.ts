import { randomUUID } from 'node:crypto';
import { db } from './db';

export interface ClaimedCommitment { id: string; commitment: string; claimToken: string; }
export interface CommitmentOutboxStore {
  claimBatch(limit: number, leaseMs: number): Promise<ClaimedCommitment[]>;
  complete(claim: ClaimedCommitment, receipt: string): Promise<boolean>;
  fail(claim: ClaimedCommitment): Promise<boolean>;
}
export class PostgresCommitmentOutboxStore implements CommitmentOutboxStore {
  async claimBatch(limit: number, leaseMs: number) {
    const now = new Date();
    const rows = await db.blockchainRecord.findMany({
      where: { attempts: { lt: 5 }, OR: [
        { status: { in: ['PENDING', 'FAILED'] } },
        { status: 'PROCESSING', leaseExpiresAt: { lt: now } },
      ] },
      orderBy: { createdAt: 'asc' }, take: Math.min(Math.max(limit * 3, 1), 30),
      select: { id: true, commitment: true, attempts: true, status: true },
    });
    const claims: ClaimedCommitment[] = [];
    for (const row of rows) {
      const claimToken = randomUUID();
      const claimed = await db.blockchainRecord.updateMany({
        where: { id: row.id, attempts: row.attempts, status: row.status,
          ...(row.status === 'PROCESSING' ? { leaseExpiresAt: { lt: new Date() } } : {}) },
        data: { status: 'PROCESSING', claimToken,
          leaseExpiresAt: new Date(Date.now() + leaseMs), attempts: { increment: 1 } },
      });
      if (claimed.count === 1) claims.push({ id: row.id, commitment: row.commitment, claimToken });
      if (claims.length >= limit) break;
    }
    return claims;
  }
  async complete(claim: ClaimedCommitment, receipt: string) {
    const changed = await db.blockchainRecord.updateMany({
      where: { id: claim.id, status: 'PROCESSING', claimToken: claim.claimToken },
      data: { status: 'CONFIRMED', receipt, confirmedAt: new Date(), claimToken: null, leaseExpiresAt: null },
    });
    return changed.count === 1;
  }
  async fail(claim: ClaimedCommitment) {
    const changed = await db.blockchainRecord.updateMany({
      where: { id: claim.id, status: 'PROCESSING', claimToken: claim.claimToken },
      data: { status: 'FAILED', claimToken: null, leaseExpiresAt: null },
    });
    return changed.count === 1;
  }
}
export const commitmentOutboxStore: CommitmentOutboxStore = new PostgresCommitmentOutboxStore();
