import { json } from '@/backend/http';
export const runtime = 'nodejs';
export async function GET() {
  return json({ status: 'ok' });
}
