import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/server/admin';
import { handle, json } from '@/server/http';
import { metricsSnapshot } from '@/server/observability';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  return handle(async () => {
    await requireAdmin(request);
    return json(metricsSnapshot());
  }, request);
}
