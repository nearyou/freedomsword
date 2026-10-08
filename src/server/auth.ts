import type { NextRequest } from 'next/server';
import { db } from './db';
import { ApiError } from './errors';
import { readSession } from '@/lib/session';
import { secret } from './secrets';
import { sessionMaxAgeSeconds } from './config';
export function sessionCookieName() {
  return process.env.NODE_ENV === 'production' ? '__Host-dd_session' : 'dd_session';
}
export function sessionCookieOptions(maxAge: number) {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? ('none' as const) : ('lax' as const),
    partitioned: production,
    path: '/',
    maxAge,
  };
}
export async function requireUser(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName())?.value;
  if (!token) throw new ApiError(401, 'Connect your Telegram account first', 'AUTH_REQUIRED');
  let data: ReturnType<typeof readSession>;
  try {
    data = readSession(token, secret('SESSION_SECRET'), Date.now(), sessionMaxAgeSeconds());
  } catch {
    throw new ApiError(401, 'Session expired. Please connect again.', 'SESSION_EXPIRED');
  }
  const user = await db.user.findUnique({ where: { id: data.userId } });
  if (!user || user.sessionVersion !== data.version)
    throw new ApiError(401, 'Session expired. Please connect again.', 'SESSION_EXPIRED');
  if (process.env.NODE_ENV === 'production' && user.telegramId.startsWith('demo:'))
    throw new ApiError(401, 'Demo sessions are disabled in production');
  return user;
}
