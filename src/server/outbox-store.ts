import { randomUUID } from 'node:crypto';
import { db } from './db';

export interface ClaimedCommitment { id: string; commitment: string; claimToken: string; }
export interface SubmittedCommitment { id: string; commitment: string; receipt: string; }
export interface CommitmentOutboxStore {
  claimBatch(limit: number, leaseMs: number): Promise<ClaimedCommitment[]>;
  complete(claim: ClaimedCommitment, receipt: string, confirmed?: boolean, adapterName?: string): Promise<boolean>;
  fail(claim: ClaimedCommitment): Promise<boolean>;
  submittedBatch(limit: number): Promise<SubmittedCommitment[]>;
  finalizeSubmitted(record: SubmittedCommitment, confirmed: boolean): Promise<boolean>;
}
export class MongoCommitmentOutboxStore implements CommitmentOutboxStore {
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
  async complete(claim: ClaimedCommitment, receipt: string, confirmed = true, adapterName = 'MOCK') {
    const changed = await db.blockchainRecord.updateMany({
      where: { id: claim.id, status: 'PROCESSING', claimToken: claim.claimToken },
      data: { status: confirmed ? 'CONFIRMED' : 'SUBMITTED', receipt, adapter: adapterName,
        confirmedAt: confirmed ? new Date() : null, claimToken: null, leaseExpiresAt: null },
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
  async submittedBatch(limit: number) {
    const rows = await db.blockchainRecord.findMany({
      where: { status: 'SUBMITTED', receipt: { not: null } },
      orderBy: { createdAt: 'asc' }, take: limit,
      select: { id: true, commitment: true, receipt: true },
    });
    return rows.filter((row): row is SubmittedCommitment => row.receipt !== null);
  }
  async finalizeSubmitted(record: SubmittedCommitment, confirmed: boolean) {
    const changed = await db.blockchainRecord.updateMany({
      where: { id: record.id, status: 'SUBMITTED', receipt: record.receipt },
      data: confirmed
        ? { status: 'CONFIRMED', confirmedAt: new Date() }
        : { status: 'FAILED', receipt: null },
    });
    return changed.count === 1;
  }
}
export const commitmentOutboxStore: CommitmentOutboxStore = new MongoCommitmentOutboxStore();
