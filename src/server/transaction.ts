import { Prisma } from '@prisma/client';
import { db } from './db';
export function retryableConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const adapter = error.meta?.driverAdapterError as
    { cause?: { originalCode?: string } } | undefined;
  const sqlState = String(error.meta?.code ?? adapter?.cause?.originalCode);
  return (
    error.code === 'P2034' || (error.code === 'P2010' && ['40001', '40P01'].includes(sqlState))
  );
}
export async function serializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 15000,
      });
    } catch (error) {
      if (!retryableConflict(error) || attempt >= 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1) + Math.random() * 30));
    }
  }
}
export async function lockCitizen(tx: Prisma.TransactionClient, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
}
