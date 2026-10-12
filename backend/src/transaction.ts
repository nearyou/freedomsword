import { Prisma } from '@prisma/client';
import { db } from './db';
export function retryableConflict(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2034' || error.code === 'P2002' || error.code === 'P2028') return true;
    return error.code === 'P2010' &&
      /TransientTransactionError/.test(JSON.stringify(error.meta ?? {}));
  }
  return error instanceof Prisma.PrismaClientUnknownRequestError &&
    /TransientTransactionError/.test(error.message);
}
export async function serializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(fn, {
        maxWait: 20000,
        timeout: 30000,
      });
    } catch (error) {
      if (!retryableConflict(error) || attempt >= 31) throw error;
      await new Promise((resolve) => setTimeout(resolve, Math.min(50 * 2 ** attempt, 900) + Math.random() * 150));
    }
  }
}
export async function lockCitizen(tx: Prisma.TransactionClient, userId: string) {
  await tx.user.update({ where: { id: userId }, data: { revision: { increment: 1 } } });
}
