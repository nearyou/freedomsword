import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { body, handle, json } from '@/server/http';
import { enforceRateLimitAsync } from '@/server/rate-limit';
import { db } from '@/server/db';
import { ApiError } from '@/server/errors';
import { TelegramAuthError, validateInitData } from '@/lib/telegram';
import { createSession } from '@/lib/session';
import { sha256 } from '@/lib/hash';
import { authMaxAgeSeconds, demoAuthEnabled, sessionMaxAgeSeconds, telegramAuthEnabled } from '@/server/config';
import { secret } from '@/server/secrets';
import { sessionCookieName, sessionCookieOptions } from '@/server/auth';
import { logAuthOutcome } from '@/server/safe-log';
import { telegramReplayStore } from '@/server/replay-store';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return handle(async () => {
    await enforceRateLimitAsync('auth', 'global', 60);
    const input = await body(
      request,
      z
        .object({ initData: z.string().max(8192).optional(), demo: z.boolean().optional() })
        .strict(),
    );
    let telegramId: string;
    let replayDigest: string | null = null;
    let replayExpiresAt: Date | null = null;
    if (input.demo === true) {
      if (!demoAuthEnabled())
        throw new ApiError(403, 'Demo authentication is disabled');
      telegramId = 'demo:local';
    } else {
      if (!telegramAuthEnabled() || !process.env.TELEGRAM_BOT_TOKEN) {
        logAuthOutcome('UNAVAILABLE');
        throw new ApiError(503, 'Telegram authentication is not configured');
      }
      try {
        telegramId = validateInitData(
          input.initData ?? '',
          process.env.TELEGRAM_BOT_TOKEN,
          Math.floor(Date.now() / 1000),
          authMaxAgeSeconds(),
        ).telegramId;
      } catch (error) {
        const expired = error instanceof TelegramAuthError && error.code === 'AUTH_EXPIRED';
        logAuthOutcome(expired ? 'EXPIRED' : 'INVALID');
        throw new ApiError(
          401,
          expired
            ? 'Telegram sign-in expired. Reopen the app from your bot.'
            : 'Telegram authentication is invalid.',
          expired ? 'AUTH_EXPIRED' : 'AUTH_INVALID',
        );
      }
      const telegramParams = new URLSearchParams(input.initData!);
      replayDigest = sha256(telegramParams.get('hash')!.toLowerCase());
      replayExpiresAt = new Date(
        (Number(telegramParams.get('auth_date')) + authMaxAgeSeconds() + 1) * 1000,
      );
    }
    const sessionSecret = secret('SESSION_SECRET');
    let user;
    try {
      user = await db.$transaction(async (tx) => {
        if (replayDigest) {
          await telegramReplayStore.claim(tx, replayDigest, replayExpiresAt!);
        }
        return tx.user.upsert({ where: { telegramId }, update: {}, create: { telegramId } });
      });
    } catch (error) {
      if (
        replayDigest &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        logAuthOutcome('REPLAYED');
        throw new ApiError(
          409,
          'This Telegram sign-in was already used. Reopen the app from your bot.',
          'AUTH_REPLAYED',
        );
      }
      throw error;
    }
    const response = json({ connected: true });
    response.cookies.set(
      sessionCookieName(),
      createSession(
        user.id,
        user.sessionVersion,
        sessionSecret,
        Date.now(),
        sessionMaxAgeSeconds(),
      ),
      sessionCookieOptions(sessionMaxAgeSeconds()),
    );
    logAuthOutcome('SUCCESS');
    return response;
  }, request, 'auth');
}
