import type { Prisma } from '@prisma/client';
import { chainHash, saltedCommitment } from '@backend/core/hash';
import type { ChainAction } from './chain/action';
export async function appendAudit(tx: Prisma.TransactionClient, privatePayload: string, electionId?: string, chainAction?: ChainAction) {
  const counter = await tx.auditCounter.upsert({
    where: { id: 'global' },
    update: { sequence: { increment: 1 } },
    create: { id: 'global', sequence: 1 },
  });
  const previous = await tx.auditEvent.findFirst({
    orderBy: { sequence: 'desc' },
    select: { hash: true },
  });
  const previousHash = previous?.hash ?? '0'.repeat(64);
  const commitment = saltedCommitment(privatePayload);
  const event = await tx.auditEvent.create({
    data: { sequence: counter.sequence, commitment, previousHash, hash: chainHash(previousHash, commitment), electionId },
  });
  await tx.blockchainRecord.create({ data: { auditId: event.id, commitment,
    actionSequence: event.sequence,
    actionJson: chainAction ? JSON.stringify(chainAction) : null } });
  return event;
}
