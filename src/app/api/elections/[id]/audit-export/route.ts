import { exportElectionAudit } from '@/server/audit-export';
import { handle, json } from '@/server/http';
import { enforceRateLimitAsync } from '@/server/rate-limit';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    await enforceRateLimitAsync('audit_export', id, 20);
    return json(await exportElectionAudit(id));
  });
}
