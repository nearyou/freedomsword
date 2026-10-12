import { z } from 'zod';
import { body, handle, json } from '@backend/http';
import { requireUser, setSessionCookie } from '@backend/auth';
import { db } from '@backend/db';

export async function POST(request: Request) {
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
    setSessionCookie(response, '', 0);
    return response;
  });
}
