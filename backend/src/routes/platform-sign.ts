import { afterCommittedOutbox } from '@backend/outbox-queue';
import { invalidateElectionCache } from '@backend/election-cache';
import { z } from 'zod';
import { body, handle, json } from '@backend/http';
import { enforceRateLimitAsync } from '@backend/rate-limit';
import { requireUser } from '@backend/auth';
import { signPlatform } from '@backend/platforms';
export async function POST(request: Request) {
  return handle(async () => {
    const input = await body(
      request,
      z
        .object({
          platformId: z.string().min(1).max(100),
          version: z.number().int().positive(),
          textHash: z.string().regex(/^[a-f0-9]{64}$/),
          accepted: z.literal(true),
        })
        .strict(),
    );
    const user = await requireUser(request);
    await enforceRateLimitAsync('platform-sign', user.id, 20);
    const result = await signPlatform(user, input);
    await Promise.all([afterCommittedOutbox(), invalidateElectionCache()]);
    return json(result);
  });
}
