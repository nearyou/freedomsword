import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { body, handle, json } from '@/backend/http';
import { requireUser, sessionCookieName, sessionCookieOptions } from '@/backend/auth';
import { db } from '@/backend/db';

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
