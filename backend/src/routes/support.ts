import { z } from 'zod';
import { requireUser } from '@backend/auth';
import { body, handle, json } from '@backend/http';
import { enforceRateLimitAsync } from '@backend/rate-limit';
import { changeSupport, readSupport } from '@backend/support';
import { afterCommittedOutbox } from '@backend/outbox-queue';
import { invalidateElectionCache } from '@backend/election-cache';
import { ApiError } from '@backend/errors';

const id = z.string().min(1).max(100);
const command = z.object({ electionId: id, candidateId: id, action: z.enum(['allocate', 'withdraw']),
  units: z.number().int().min(1).max(100), requestId: z.string().uuid() }).strict();

export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);
    await enforceRateLimitAsync('support-read', user.id, 60);
    const electionId = id.safeParse(new URL(request.url).searchParams.get('electionId'));
    if (!electionId.success) throw new ApiError(400, 'Election ID is required');
    return json(await readSupport(user, electionId.data));
  }, request);
}

export async function POST(request: Request) {
  return handle(async () => {
    const input = await body(request, command);
    const user = await requireUser(request);
    await enforceRateLimitAsync('support-write', user.id, 20);
    const result = await changeSupport(user, input);
    await Promise.all([afterCommittedOutbox(), invalidateElectionCache()]);
    return json(result);
  }, request);
}
