import { db } from '@backend/db';
import { handle, json } from '@backend/http';
export const runtime = 'nodejs';
export async function GET() {
  return handle(async () => {
    try {
      await db.$runCommandRaw({ ping: 1 });
      await Promise.all([db.election.count(), db.rateLimitCounter.count()]);
      return json({ status: 'ok', dependencies: { mongodb: 'ok' } });
    } catch {
      return json({ status: 'unavailable' }, 503);
    }
  });
}
