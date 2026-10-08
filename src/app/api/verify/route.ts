import { settleMockOutbox } from '@/server/blockchain';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/server/auth';
import { body, handle, json } from '@/server/http';
import { enforceRateLimitAsync } from '@/server/rate-limit';
import { verifyCitizen } from '@/server/verification';
export async function POST(request: NextRequest) {
  return handle(async () => {
    const input = await body(
      request,
      z.object({ consent: z.literal(true), proof: z.unknown().optional() }).strict(),
    );
    const user = await requireUser(request);
    await enforceRateLimitAsync('verify', user.id, 10);
    const result = await verifyCitizen(user, undefined, input.proof);
    await settleMockOutbox();
    return json(result);
  });
}
