import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { body, handle, json, rateLimit } from '../src/server/http';
import { requireUser, sessionCookieOptions } from '../src/server/auth';
import { createSession } from '../src/lib/session';
import { db } from '../src/server/db';
import { POST as authenticate } from '../src/app/api/auth/route';
import { POST as logout } from '../src/app/api/logout/route';
const origin = 'http://localhost:3000';
const sessionSecret = 'a'.repeat(64);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
it('rejects cross-origin writes, unknown fields and oversized bodies', async () => {
  vi.stubEnv('APP_ORIGIN', origin);
  const request = (payload: string, from = origin) =>
    new Request(`${origin}/api/vote`, {
      method: 'POST',
      headers: { origin: from, 'content-type': 'application/json' },
      body: payload,
    });
  await expect(
    body(request('{}', 'https://attacker.example'), z.object({}).strict()),
  ).rejects.toMatchObject({ status: 403 });
  await expect(body(request('{"userId":"override"}'), z.object({}).strict())).rejects.toMatchObject(
    { status: 400 },
  );
  await expect(body(request(' '.repeat(16385)), z.object({}).strict())).rejects.toMatchObject({
    status: 413,
  });
  await expect(
    body(
      new Request(`${origin}/api/vote`, { method: 'POST', headers: { origin }, body: '{}' }),
      z.object({}).strict(),
    ),
  ).rejects.toMatchObject({ status: 415 });
});
it('enforces bounded rate-limit windows', () => {
  rateLimit('test-window', 1, 1000);
  expect(() => rateLimit('test-window', 1, 1001)).toThrow('Too many');
  expect(() => rateLimit('test-window', 1, 61001)).not.toThrow();
});
it('sanitizes unexpected errors and disables response caching', async () => {
  const response = await handle(async () => {
    throw new Error('private telegram identifier and database secret');
  });
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('secret');
  expect(json({ ok: true }).headers.get('Cache-Control')).toBe('no-store');
});
it('rejects demo login in production even when explicitly enabled', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('ALLOW_DEMO_AUTH', 'true');
  vi.stubEnv('APP_ORIGIN', origin);
  const response = await authenticate(
    new Request(`${origin}/api/auth`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: '{"demo":true}',
    }),
  );
  expect(response.status).toBe(403);
});
it('rejects existing demo sessions and honors session revocation in production', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('SESSION_SECRET', sessionSecret);
  const user = {
    id: 'd6235234-6895-425c-a4e0-4a61a3c19788',
    telegramId: 'demo:local',
    voterKey: 'private-key',
    sessionVersion: 1,
    createdAt: new Date(),
  };
  const lookup = vi.spyOn(db.user, 'findUnique').mockResolvedValue(user);
  const request = new NextRequest(origin, {
    headers: { cookie: `__Host-dd_session=${createSession(user.id, 1, sessionSecret)}` },
  });
  await expect(requireUser(request)).rejects.toThrow('Demo sessions');
  lookup.mockResolvedValue({ ...user, telegramId: '123', sessionVersion: 2 });
  await expect(requireUser(request)).rejects.toThrow('Session expired');
  lookup.mockResolvedValue({ ...user, telegramId: '123' });
  expect((await requireUser(request)).id).toBe(user.id);
});
it('uses secure production cookies and revokes a valid session on logout', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('SESSION_SECRET', sessionSecret);
  vi.stubEnv('APP_ORIGIN', origin);
  expect(sessionCookieOptions(3600)).toMatchObject({
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    maxAge: 3600,
  });
  const user = {
    id: 'd6235234-6895-425c-a4e0-4a61a3c19788',
    telegramId: '123',
    voterKey: 'private-key',
    sessionVersion: 1,
    createdAt: new Date(),
  };
  vi.spyOn(db.user, 'findUnique').mockResolvedValue(user);
  const update = vi.spyOn(db.user, 'updateMany').mockResolvedValue({ count: 1 });
  const response = await logout(
    new NextRequest(`${origin}/api/logout`, {
      method: 'POST',
      headers: {
        origin,
        'content-type': 'application/json',
        cookie: `__Host-dd_session=${createSession(user.id, 1, sessionSecret)}`,
      },
      body: '{}',
    }),
  );
  expect(response.status).toBe(200);
  expect(update).toHaveBeenCalledOnce();
  expect(response.headers.get('set-cookie')).toContain('Secure');
  expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  const expired = await logout(
    new NextRequest(`${origin}/api/logout`, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: '{}',
    }),
  );
  expect(expired.status).toBe(200);
  expect(expired.headers.get('set-cookie')).toContain('Max-Age=0');
});
