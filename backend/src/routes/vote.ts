import { afterCommittedOutbox } from '@backend/outbox-queue';
import { invalidateElectionCache } from '@backend/election-cache';
import { z } from 'zod';
import { body, handle, json } from '@backend/http';
import { enforceRateLimitAsync } from '@backend/rate-limit';
import { requireUser } from '@backend/auth';
import { castVote } from '@backend/voting';
export async function POST(request: Request) {
  return handle(async () => {
    const input = await body(
      request,
      z
        .object({
          electionId: z.string().min(1).max(100),
          candidateId: z.string().min(1).max(100),
          requestId: z.string().uuid(),
        })
        .strict(),
    );
    const user = await requireUser(request);
    await enforceRateLimitAsync('vote', user.id, 20);
    const result = await castVote(user, input);
    await Promise.all([afterCommittedOutbox(), invalidateElectionCache()]);
    return json(result);
  }, request, 'vote');
}
