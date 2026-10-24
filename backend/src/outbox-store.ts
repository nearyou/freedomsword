import { randomUUID } from 'node:crypto';
import { db } from './db';

export interface ClaimedCommitment { id: string; commitment: string; claimToken: string; actionJson?: string | null; attempts?: number; }
export interface SubmittedCommitment { id: string; commitment: string; receipt: string; actionJson?: string | null; submittedAt?: Date | null; }
export type SubmittedOutcome = 'confirmed' | 'failed';
export interface CommitmentOutboxStore {
  claimBatch(limit: number, leaseMs: number): Promise<ClaimedCommitment[]>;
  complete(claim: ClaimedCommitment, receipt: string, confirmed?: boolean, adapterName?: string): Promise<boolean>;
  fail(claim: ClaimedCommitment): Promise<boolean>;
  reject(claim: ClaimedCommitment): Promise<boolean>;
  submittedBatch(limit: number): Promise<SubmittedCommitment[]>;
  finalizeSubmitted(record: SubmittedCommitment, outcome: SubmittedOutcome): Promise<boolean>;
}

/** Transient failures retry after 15s, doubling up to 15 minutes; they never stop the queue for good. */
export function retryDelayMs(attempts: number) {
  return Math.min(15_000 * 2 ** Math.max(0, attempts - 1), 15 * 60_000);
}

const settled = ['CONFIRMED', 'REJECTED'] as const;
const retryDue = (now: Date) => [
  { nextAttemptAt: { isSet: false } }, { nextAttemptAt: null }, { nextAttemptAt: { lt: now } },
];

export class MongoCommitmentOutboxStore implements CommitmentOutboxStore {
  async claimBatch(limit: number, leaseMs: number) {
    const now = new Date();
    // Sepolia uses one global in-flight action so a recall cannot mine before its cast.
    // A chain-rejected action is REJECTED, not left at the head, so it cannot block later actions.
    const firstUnsettled = limit === 1 ? await db.blockchainRecord.findFirst({
      where: { status: { notIn: [...settled] } },
      orderBy: [{ actionSequence: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, commitment: true, actionJson: true, attempts: true, status: true,
        leaseExpiresAt: true, nextAttemptAt: true },
    }) : null;
    if (limit === 1 && (!firstUnsettled ||
      firstUnsettled.status === 'SUBMITTED' ||
      (firstUnsettled.status === 'FAILED' &&
        firstUnsettled.nextAttemptAt && firstUnsettled.nextAttemptAt >= now) ||
      (firstUnsettled.status === 'PROCESSING' &&
        firstUnsettled.leaseExpiresAt && firstUnsettled.leaseExpiresAt >= now))) return [];
    const rows = firstUnsettled ? [firstUnsettled] : await db.blockchainRecord.findMany({
      where: { OR: [
        { status: 'PENDING' },
        { status: 'FAILED', OR: retryDue(now) },
        { status: 'PROCESSING', leaseExpiresAt: { lt: now } },
      ] },
      orderBy: { createdAt: 'asc' }, take: Math.min(Math.max(limit * 3, 1), 30),
      select: { id: true, commitment: true, actionJson: true, attempts: true, status: true },
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
      if (claimed.count === 1) claims.push({ id: row.id, commitment: row.commitment,
        actionJson: row.actionJson, claimToken, attempts: row.attempts + 1 });
      if (claims.length >= limit) break;
    }
    return claims;
  }
  async complete(claim: ClaimedCommitment, receipt: string, confirmed = true, adapterName = 'MOCK') {
    const changed = await db.blockchainRecord.updateMany({
      where: { id: claim.id, status: 'PROCESSING', claimToken: claim.claimToken },
      data: { status: confirmed ? 'CONFIRMED' : 'SUBMITTED', receipt, adapter: adapterName,
        confirmedAt: confirmed ? new Date() : null, submittedAt: confirmed ? null : new Date(),
        claimToken: null, leaseExpiresAt: null, nextAttemptAt: null },
    });
    return changed.count === 1;
  }
  async fail(claim: ClaimedCommitment) {
    const changed = await db.blockchainRecord.updateMany({
      where: { id: claim.id, status: 'PROCESSING', claimToken: claim.claimToken },
      data: { status: 'FAILED', claimToken: null, leaseExpiresAt: null,
        nextAttemptAt: new Date(Date.now() + retryDelayMs(claim.attempts ?? 1)) },
    });
    return changed.count === 1;
  }
  async reject(claim: ClaimedCommitment) {
    const changed = await db.blockchainRecord.updateMany({
      where: { id: claim.id, status: 'PROCESSING', claimToken: claim.claimToken },
      data: { status: 'REJECTED', claimToken: null, leaseExpiresAt: null, nextAttemptAt: null },
    });
    return changed.count === 1;
  }
  async submittedBatch(limit: number) {
    const rows = await db.blockchainRecord.findMany({
      where: { status: 'SUBMITTED', receipt: { not: null } },
      orderBy: { createdAt: 'asc' }, take: limit,
      select: { id: true, commitment: true, actionJson: true, receipt: true, submittedAt: true },
    });
    return rows.filter((row) => row.receipt !== null).map((row) => ({
      id: row.id, commitment: row.commitment, actionJson: row.actionJson, receipt: row.receipt!,
      submittedAt: row.submittedAt,
    }));
  }
  async finalizeSubmitted(record: SubmittedCommitment, outcome: SubmittedOutcome) {
    const changed = await db.blockchainRecord.updateMany({
      where: { id: record.id, status: 'SUBMITTED', receipt: record.receipt },
      data: outcome === 'confirmed'
        ? { status: 'CONFIRMED', confirmedAt: new Date() }
        // A dropped or reverted submission is resent at once; the adapter checks it was not applied.
        : { status: 'FAILED', receipt: null, submittedAt: null, nextAttemptAt: null },
    });
    return changed.count === 1;
  }
}
export const commitmentOutboxStore: CommitmentOutboxStore = new MongoCommitmentOutboxStore();
