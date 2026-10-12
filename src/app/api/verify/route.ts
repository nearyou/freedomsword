import { settleOutbox } from '@/backend/blockchain';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/backend/auth';
import { body, handle, json } from '@/backend/http';
import { enforceRateLimitAsync } from '@/backend/rate-limit';
import { verifyCitizen } from '@/backend/verification';
export async function POST(request: NextRequest) {
  return handle(async () => {
    const input = await body(
      request,
      z.object({ consent: z.literal(true), proof: z.unknown().optional() }).strict(),
    );
    const user = await requireUser(request);
    await enforceRateLimitAsync('verify', user.id, 10);
    const result = await verifyCitizen(user, undefined, input.proof);
    await settleOutbox();
    return json(result);
  });
}
