import { db } from '@backend/db';
import { handle, json } from '@backend/http';
export async function GET() {
  return handle(async () => {
    try {
      await db.$runCommandRaw({ ping: 1 });
      await Promise.all([db.election.count(), db.rateLimitCounter.count()]);
      return json({ status: 'ok', dependencies: { mongodb: 'ok' } });
    } catch (error) {
      console.error('MongoDB readiness check failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
        code: typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code) : undefined,
      });
      return json({ status: 'unavailable' }, 503);
    }
  });
}
