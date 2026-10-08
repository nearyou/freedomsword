import type { Prisma } from '@prisma/client';
import { chainHash, saltedCommitment } from '@/lib/hash';
export async function appendAudit(tx: Prisma.TransactionClient, privatePayload: string, electionId?: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(741219)`;
  const previous = await tx.auditEvent.findFirst({
    orderBy: { sequence: 'desc' },
    select: { hash: true },
  });
  const previousHash = previous?.hash ?? '0'.repeat(64);
  const commitment = saltedCommitment(privatePayload);
  const event = await tx.auditEvent.create({
    data: { commitment, previousHash, hash: chainHash(previousHash, commitment), electionId },
  });
  await tx.blockchainRecord.create({ data: { auditId: event.id, commitment } });
  return event;
}
