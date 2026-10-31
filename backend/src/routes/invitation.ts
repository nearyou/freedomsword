import { z } from 'zod';
import { requireUser } from '@backend/auth';
import { body, handle, json } from '@backend/http';
import { enforceRateLimitAsync } from '@backend/rate-limit';
import { prepareInvitation } from '@backend/invitation';

export async function POST(request: Request) {
  return handle(async () => {
    const { language } = await body(request, z.object({ language: z.enum(['en', 'uk']) }).strict());
    const user = await requireUser(request);
    await enforceRateLimitAsync('invitation', user.id, 10);
    return json(await prepareInvitation(user.telegramId, language));
  }, request);
}
