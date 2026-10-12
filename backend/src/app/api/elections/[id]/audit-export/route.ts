import { exportElectionAudit } from '@backend/audit-export';
import { handle, json } from '@backend/http';
import { enforceRateLimitAsync } from '@backend/rate-limit';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    await enforceRateLimitAsync('audit_export', id, 20);
    return json(await exportElectionAudit(id));
  });
}
