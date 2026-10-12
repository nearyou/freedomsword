import { settleOutbox } from '@/backend/blockchain';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { body, handle, json } from '@/backend/http';
import { enforceRateLimitAsync } from '@/backend/rate-limit';
import { requireUser } from '@/backend/auth';
import { recallVote } from '@/backend/voting';
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
    await settleOutbox();
    return json(result);
  }, request, 'recall');
}
