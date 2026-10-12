import { randomUUID } from 'node:crypto';
import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  subject: 'rate-limit-route-test-subject',
  cast: vi.fn(async () => ({ balance: 100, replayed: false })),
}));
vi.mock('@backend/auth', () => ({ requireUser: async () => ({ id: mocks.subject }) }));
vi.mock('@backend/voting', () => ({ castVote: mocks.cast }));
vi.mock('@backend/blockchain', () => ({ settleOutbox: async () => {} }));

import { POST } from '../backend/src/routes/vote';
afterEach(() => vi.unstubAllEnvs());

it('returns 429 for a protected vote route without performing the denied vote', async () => {
  const origin = 'http://localhost:3000';
  vi.stubEnv('APP_ORIGIN', origin);
  const request = () =>
    new Request(`${origin}/api/vote`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ electionId: 'e', candidateId: 'c', requestId: randomUUID() }),
    });
  for (let i = 0; i < 20; i++) expect((await POST(request())).status).toBe(200);
  const limited = await POST(request());
  expect(limited.status).toBe(429);
  expect((await limited.json()).code).toBe('RATE_LIMITED');
  expect(mocks.cast).toHaveBeenCalledTimes(20);
});
