import { exportElectionAudit } from '@backend/audit-export';
import { handle, json } from '@backend/http';
import { enforceRateLimitAsync } from '@backend/rate-limit';
export async function GET(_request: Request, id: string) {
  return handle(async () => {
    await enforceRateLimitAsync('audit_export', id, 20);
    return json(await exportElectionAudit(id));
  });
}
