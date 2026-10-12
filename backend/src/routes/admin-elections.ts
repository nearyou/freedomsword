import { adminCommand, adminElections, administer, requireAdmin } from '@backend/admin';
import { body, handle, json } from '@backend/http';
import { settleOutbox } from '@backend/blockchain';
export async function GET(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    return json({ elections: await adminElections() });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    const input = await body(request, adminCommand);
    const user = await requireAdmin(request);
    const result = await administer(user.id, input);
    await settleOutbox();
    return json(result);
  });
}
