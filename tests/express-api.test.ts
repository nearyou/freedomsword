import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import app from '../backend/src/app';

let server: Server;
let base: string;

beforeAll(async () => {
  vi.stubEnv('APP_ENV', 'development');
  vi.stubEnv('DATABASE_URL', 'mongodb://127.0.0.1:27017/fs_express_test');
  vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
  vi.stubEnv('TELEGRAM_AUTH_ENABLED', 'false');
  vi.stubEnv('SESSION_SECRET', 'session-secret-for-express-route-tests-0123456789');
  vi.stubEnv('BALLOT_SECRET', 'ballot-secret-for-express-route-tests-0123456789');
  vi.stubEnv('ELIGIBILITY_COMMITMENT_SECRET', 'eligibility-secret-for-express-tests-0123456789');
  vi.stubEnv('RATE_LIMIT_BACKEND', 'memory');
  vi.stubEnv('BLOCKCHAIN_ADAPTER', 'mock');
  vi.stubEnv('ALLOW_DEMO_AUTH', 'false');
  server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  vi.unstubAllEnvs();
});

it('serves the existing public API through Express without framework headers', async () => {
  const health = await fetch(`${base}/api/health`);
  expect(health.status).toBe(200);
  expect(await health.json()).toEqual({ status: 'ok' });
  expect(health.headers.get('cache-control')).toBe('no-store');
  expect(health.headers.has('x-powered-by')).toBe(false);

  const agreement = await fetch(`${base}/api/agreement`);
  expect(agreement.status).toBe(200);
  expect(await agreement.json()).toMatchObject({ version: expect.any(Number), textHash: expect.stringMatching(/^[a-f0-9]{64}$/) });
});

it('preserves origin checks and bounded request bodies at the HTTP boundary', async () => {
  const blocked = await fetch(`${base}/api/auth`, {
    method: 'POST', headers: { origin: 'https://attacker.example', 'content-type': 'application/json' }, body: '{}',
  });
  expect(blocked.status).toBe(403);
  expect(blocked.headers.has('set-cookie')).toBe(false);

  const oversized = await fetch(`${base}/api/auth`, {
    method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: ' '.repeat(16_385),
  });
  expect(oversized.status).toBe(413);
  expect(oversized.headers.get('cache-control')).toBe('no-store');
});

it('forwards session cookies through the Express response adapter', async () => {
  const logout = await fetch(`${base}/api/logout`, {
    method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: '{}',
  });
  expect(logout.status).toBe(200);
  expect(logout.headers.get('set-cookie')).toContain('dd_session=');
  expect(logout.headers.get('set-cookie')).toContain('Max-Age=0');
  expect(logout.headers.get('set-cookie')).toContain('HttpOnly');
});

it('returns explicit method and missing-route responses', async () => {
  const method = await fetch(`${base}/api/vote`);
  expect(method.status).toBe(405);
  expect(method.headers.get('allow')).toBe('POST');
  expect((await fetch(`${base}/api/missing`)).status).toBe(404);
});
