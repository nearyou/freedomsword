import { db } from '@/server/db';
import { handle, json } from '@/server/http';
export const runtime = 'nodejs';
export async function GET() {
  return handle(async () => {
    try {
      const [state] = await db.$queryRaw<{ elections: boolean; rateLimits: boolean }[]>`
        SELECT to_regclass('public."Election"') IS NOT NULL AS elections,
          to_regclass('public."RateLimitCounter"') IS NOT NULL AS "rateLimits"`;
      if (!state?.elections || !state.rateLimits) throw new Error('Schema unavailable');
      return json({ status: 'ok', dependencies: { postgres: 'ok', schema: 'ok' } });
    } catch {
      return json({ status: 'unavailable' }, 503);
    }
  });
}
