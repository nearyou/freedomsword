import { Prisma } from '@prisma/client';
import { db } from './db';
import { verifyAuditSegment } from '@/lib/audit-chain';
import { sha256 } from '@/lib/hash';

/** Read-only consistent evidence check for a restored or running PostgreSQL database. */
export async function verifyDatabaseEvidence() {
  return db.$transaction(async (tx) => {
    const events = await tx.auditEvent.findMany({ orderBy: { sequence: 'asc' },
      select: { sequence: true, commitment: true, previousHash: true, hash: true,
        blockchain: { select: { commitment: true } } } });
    if (!verifyAuditSegment(events, '0'.repeat(64)) ||
      events.some((event) => event.blockchain?.commitment !== event.commitment))
      throw new Error('Audit chain or outbox commitment integrity failed');
    const ballots = await tx.vote.findMany({ select: { balance: true,
      events: { select: { type: true, units: true } } } });
    if (ballots.some((ballot) => ballot.events.reduce((sum, event) => sum + event.units, 0) !== ballot.balance ||
      ballot.events.filter((event) => event.type === 'CAST' && event.units === 100).length !== 1))
      throw new Error('Ballot ledger integrity failed');
    const platforms = await tx.candidatePlatform.findMany({ select: { content: true, contentHash: true } });
    if (platforms.some((platform) => sha256(platform.content) !== platform.contentHash))
      throw new Error('Platform version integrity failed');
    return { auditEvents: events.length, ballots: ballots.length, platforms: platforms.length,
      rootHash: events.at(-1)?.hash ?? '0'.repeat(64) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
