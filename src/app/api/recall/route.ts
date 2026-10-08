import { settleMockOutbox } from '@/server/blockchain';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { body, handle, json } from '@/server/http';
import { enforceRateLimitAsync } from '@/server/rate-limit';
import { requireUser } from '@/server/auth';
import { recallVote } from '@/server/voting';
export async function POST(request: NextRequest) {
  return handle(async () => {
    const input = await body(
      request,
      z
        .object({
          electionId: z.string().min(1).max(100),
          mode: z.enum(['partial', 'full']),
          requestId: z.string().uuid(),
        })
        .strict(),
    );
    const user = await requireUser(request);
    await enforceRateLimitAsync('recall', user.id, 20);
    const result = await recallVote(user, input);
    await settleMockOutbox();
    return json(result);
  }, request, 'recall');
}
