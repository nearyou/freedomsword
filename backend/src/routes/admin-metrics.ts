import { requireAdmin } from '@backend/admin';
import { handle, json } from '@backend/http';
import { metricsSnapshot } from '@backend/observability';
export async function GET(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    return json(metricsSnapshot());
  }, request);
}
