import { settleMockOutbox } from '@/server/blockchain';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { body, handle, json } from '@/server/http';
import { enforceRateLimitAsync } from '@/server/rate-limit';
import { requireUser } from '@/server/auth';
import { signPlatform } from '@/server/platforms';
export async function POST(request: NextRequest) {
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
    await settleMockOutbox();
    return json(result);
  });
}
