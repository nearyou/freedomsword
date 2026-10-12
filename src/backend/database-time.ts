import type { Prisma } from '@prisma/client';

/** Application clocks must be synchronized on every deployment instance. */
export async function databaseNow(_tx?: Prisma.TransactionClient) {
  void _tx;
  return new Date();
}
