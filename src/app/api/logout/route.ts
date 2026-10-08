import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { body, handle, json } from '@/server/http';
import { requireUser, sessionCookieName, sessionCookieOptions } from '@/server/auth';
import { db } from '@/server/db';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  return handle(async () => {
    await body(request, z.object({}).strict());
    try {
      const user = await requireUser(request);
      await db.user.updateMany({
        where: { id: user.id, sessionVersion: user.sessionVersion },
        data: { sessionVersion: { increment: 1 } },
      });
    } catch (error) {
      // An already expired cookie can still be cleared locally.
      if (!(error instanceof Error) || !('status' in error) || error.status !== 401) throw error;
    }
    const response = json({ connected: false });
    response.cookies.set(sessionCookieName(), '', sessionCookieOptions(0));
    return response;
  });
}
