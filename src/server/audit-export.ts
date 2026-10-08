import { Prisma } from '@prisma/client';
import { db } from './db';
import { electionTransparencySnapshot } from './transparency';
import { hashAuditBundle } from '@/lib/audit-export';

export async function exportElectionAudit(electionId: string) {
  return db.$transaction(async (tx) => {
    const publicData = await electionTransparencySnapshot(tx, electionId, null);
    const publicAuditChain = await tx.auditEvent.findMany({
      orderBy: { sequence: 'asc' },
      select: { sequence: true, electionId: true, commitment: true, previousHash: true, hash: true,
        blockchain: { select: { adapter: true, status: true, receipt: true } } },
    });
    const bundle = {
      schemaVersion: 'dynamic-democracy-audit-bundle/v1',
      generatedAt: new Date().toISOString(),
      election: publicData.election,
      candidates: publicData.candidates,
      aggregates: publicData.totals,
      electionAudit: publicData.audit.recentEvents,
      publicAuditChain,
      note: 'The chain is global; electionAudit selects tagged commitments. Hashes prove this file has not changed since export, not that source records are independently truthful.',
    };
    return { algorithm: 'SHA-256' as const, sha256: hashAuditBundle(bundle), bundle };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
