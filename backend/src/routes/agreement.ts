import { afterCommittedOutbox } from '@backend/outbox-queue';
import { z } from 'zod';
import { AGREEMENT_TEXT, AGREEMENT_VERSION } from '@backend/core/agreement';
import { sha256 } from '@backend/core/hash';
import { requireUser } from '@backend/auth';
import { body, handle, json } from '@backend/http';
import { enforceRateLimitAsync } from '@backend/rate-limit';
import { signCitizenAgreement } from '@backend/verification';
export async function GET() {
  return json({
    text: AGREEMENT_TEXT,
    version: AGREEMENT_VERSION,
    textHash: sha256(AGREEMENT_TEXT),
  });
}
export async function POST(request: Request) {
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
    await afterCommittedOutbox();
    return json(result);
  });
}
