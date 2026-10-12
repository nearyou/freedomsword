import { timingSafeEqual } from 'node:crypto';
import { processOutbox } from '@/backend/blockchain';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization') ?? '';
  const expected = secret ? `Bearer ${secret}` : '';
  const accepted = !!secret && secret.length >= 16 &&
    authorization.length === expected.length &&
    timingSafeEqual(Buffer.from(authorization), Buffer.from(expected));
  if (!accepted) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return Response.json(await processOutbox(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Outbox unavailable' }, { status: 503 });
  }
}
