import { settleMockOutbox } from '@/server/blockchain';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { AGREEMENT_TEXT, AGREEMENT_VERSION } from '@/lib/agreement';
import { sha256 } from '@/lib/hash';
import { requireUser } from '@/server/auth';
import { body, handle, json } from '@/server/http';
import { enforceRateLimitAsync } from '@/server/rate-limit';
import { signCitizenAgreement } from '@/server/verification';
export async function GET() {
  return json({
    text: AGREEMENT_TEXT,
    version: AGREEMENT_VERSION,
    textHash: sha256(AGREEMENT_TEXT),
  });
}
export async function POST(request: NextRequest) {
  return handle(async () => {
    const input = await body(
      request,
      z
        .object({ accepted: z.literal(true), textHash: z.string().regex(/^[a-f0-9]{64}$/) })
        .strict(),
    );
    const user = await requireUser(request);
    await enforceRateLimitAsync('agreement', user.id, 20);
    const result = await signCitizenAgreement(user, input.textHash);
    await settleMockOutbox();
    return json(result);
  });
}
