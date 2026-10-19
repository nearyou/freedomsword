import { afterCommittedOutbox } from '@backend/outbox-queue';
import { z } from 'zod';
import { requireUser } from '@backend/auth';
import { body, handle, json } from '@backend/http';
import { enforceRateLimitAsync } from '@backend/rate-limit';
import { verifyCitizen } from '@backend/verification';
export async function POST(request: Request) {
  return handle(async () => {
    const input = await body(
      request,
      z.object({ consent: z.literal(true), proof: z.unknown().optional() }).strict(),
    );
    const user = await requireUser(request);
    await enforceRateLimitAsync('verify', user.id, 10);
    const result = await verifyCitizen(user, undefined, input.proof);
    await afterCommittedOutbox();
    return json(result);
  });
}
