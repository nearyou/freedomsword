import type { Prisma } from '@prisma/client';

/** Claims a validated Telegram digest in the same transaction that creates its session user. */
export interface TelegramReplayStore {
  claim(tx: Prisma.TransactionClient, digest: string, expiresAt: Date): Promise<void>;
}
export class PostgresTelegramReplayStore implements TelegramReplayStore {
  async claim(tx: Prisma.TransactionClient, digest: string, expiresAt: Date) {
    await tx.telegramAuthReplay.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await tx.telegramAuthReplay.create({ data: { digest, expiresAt } });
  }
}
export const telegramReplayStore: TelegramReplayStore = new PostgresTelegramReplayStore();
