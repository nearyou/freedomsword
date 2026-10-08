import type { Prisma } from '@prisma/client';

/** PostgreSQL's numeric epoch avoids timezone conversion of raw timestamp values by adapters. */
export async function databaseNow(tx: Prisma.TransactionClient) {
  const [row] = await tx.$queryRaw<{ epoch: number }[]>`
    SELECT EXTRACT(EPOCH FROM clock_timestamp())::double precision AS epoch`;
  return new Date(row.epoch * 1000);
}
