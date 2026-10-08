import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { body, handle, json, rateLimitAsync } from '@/server/http';
import { requireUser } from '@/server/auth';
import { flushOutbox } from '@/server/blockchain';
export async function POST(request: NextRequest) {
  return handle(async () => {
    await body(request, z.object({}).strict());
    const user = await requireUser(request);
    await rateLimitAsync(`outbox:${user.id}`, 5);
    await rateLimitAsync('outbox:global', 30);
    return json(await flushOutbox());
  });
}
