import { afterEach, expect, it, vi } from 'vitest';
import { db } from '../src/server/db';
import { GET as health } from '../src/app/api/health/route';
import { GET as ready } from '../src/app/api/ready/route';

afterEach(() => vi.restoreAllMocks());
it('exposes only process liveness and database readiness', async () => {
  expect(await (await health()).json()).toEqual({ status: 'ok' });
  const query = vi.spyOn(db, '$queryRaw').mockResolvedValueOnce([{ elections: true, rateLimits: true }]);
  expect((await ready()).status).toBe(200);
  query.mockRejectedValueOnce(new Error('secret database URL'));
  const unavailable = await ready();
  expect(unavailable.status).toBe(503);
  expect(await unavailable.json()).toEqual({ status: 'unavailable' });
});
