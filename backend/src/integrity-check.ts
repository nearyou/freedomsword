import { db } from './db';
import { verifyAuditSegment } from '@backend/core/audit-chain';
import { sha256 } from '@backend/core/hash';
import { supportBalance } from './core/support';

/** Read-only consistent evidence check for the MongoDB ledger. */
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
    const supportBudgets = await tx.supportBudget.findMany({ include: {
      allocations: true, withdrawals: true, events: true,
    } });
    for (const budget of supportBudgets) {
      supportBalance(budget.allocations, budget.withdrawals, new Date());
      const candidates = new Set([...budget.allocations.map((entry) => entry.candidateId),
        ...budget.events.map((event) => event.candidateId)]);
      for (const candidateId of candidates) {
        const balance = budget.events.filter((event) => event.candidateId === candidateId)
          .reduce((sum, event) => sum + (event.type === 'ALLOCATE' ? event.units : -event.units), 0);
        if (balance !== (budget.allocations.find((entry) => entry.candidateId === candidateId)?.units ?? 0))
          throw new Error('Reusable support ledger integrity failed');
      }
      if (budget.withdrawals.reduce((sum, entry) => sum + entry.units, 0) !==
        budget.events.filter((event) => event.type === 'WITHDRAW').reduce((sum, event) => sum + event.units, 0))
        throw new Error('Reusable support withdrawal integrity failed');
    }
    const platforms = await tx.candidatePlatform.findMany({ select: { content: true, contentHash: true } });
    if (platforms.some((platform) => sha256(platform.content) !== platform.contentHash))
      throw new Error('Platform version integrity failed');
    return { auditEvents: events.length, ballots: ballots.length, supportBudgets: supportBudgets.length, platforms: platforms.length,
      rootHash: events.at(-1)?.hash ?? '0'.repeat(64) };
  }, { maxWait: 20_000, timeout: 30_000 });
}
