import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
const sessionSchema = z
  .object({
    userId: z.string().uuid(),
    version: z.number().int().positive(),
    expires: z.number().int(),
  })
  .strict();
export function createSession(
  userId: string,
  version: number,
  secret: string,
  now = Date.now(),
  maxAgeSeconds = 21_600,
) {
  const body = Buffer.from(
    JSON.stringify({ userId, version, expires: now + maxAgeSeconds * 1000 }),
  ).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
export function readSession(
  token: string,
  secret: string,
  now = Date.now(),
  maxAgeSeconds = 21_600,
) {
  if (token.length > 2048) throw new Error('Invalid session');
  const parts = token.split('.');
  if (parts.length !== 2 || !parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p)))
    throw new Error('Invalid session');
  const expected = createHmac('sha256', secret).update(parts[0]).digest();
  const received = Buffer.from(parts[1], 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(expected, received))
    throw new Error('Invalid session');
  const data = sessionSchema.parse(JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')));
  if (data.expires <= now || data.expires > now + maxAgeSeconds * 1000)
    throw new Error('Expired session');
  return data;
}
