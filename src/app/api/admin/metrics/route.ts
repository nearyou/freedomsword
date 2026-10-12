import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/backend/admin';
import { handle, json } from '@/backend/http';
import { metricsSnapshot } from '@/backend/observability';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  return handle(async () => {
    await requireAdmin(request);
    return json(metricsSnapshot());
  }, request);
}
