import { afterEach, expect, it, vi } from 'vitest';
import { db } from '../backend/src/db';
import { GET as health } from '../backend/src/routes/health';
import { GET as ready } from '../backend/src/routes/ready';

afterEach(() => vi.restoreAllMocks());
it('exposes only process liveness and database readiness', async () => {
  expect(await (await health()).json()).toEqual({ status: 'ok' });
  const query = vi.spyOn(db, '$runCommandRaw').mockResolvedValueOnce({ ok: 1 });
  vi.spyOn(db.election, 'count').mockResolvedValue(0);
  vi.spyOn(db.rateLimitCounter, 'count').mockResolvedValue(0);
  expect((await ready()).status).toBe(200);
  query.mockRejectedValueOnce(new Error('secret database URL'));
  const unavailable = await ready();
  expect(unavailable.status).toBe(503);
  expect(await unavailable.json()).toEqual({ status: 'unavailable' });
});
