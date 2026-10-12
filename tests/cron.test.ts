import { expect, it, vi } from 'vitest';

vi.mock('@/backend/blockchain', () => ({ processOutbox: vi.fn(async () => ({ processed: 0 })) }));
import { GET } from '../src/app/api/cron/outbox/route';

it('requires the configured cron bearer token before processing outbox work', async () => {
  vi.stubEnv('CRON_SECRET', 'a-private-schedule-secret');
  expect((await GET(new Request('https://app.example/api/cron/outbox'))).status).toBe(401);
  const authorized = await GET(new Request('https://app.example/api/cron/outbox', {
    headers: { authorization: 'Bearer a-private-schedule-secret' },
  }));
  expect(authorized.status).toBe(200);
  expect(await authorized.json()).toEqual({ processed: 0 });
  vi.unstubAllEnvs();
});
