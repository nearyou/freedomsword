import { json } from '@backend/http';
export async function GET() {
  return json({ status: 'ok' });
}
