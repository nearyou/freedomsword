import { handle, json } from '@/server/http';
import { listElections } from '@/server/elections';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return handle(async () => {
    const q = new URL(request.url).searchParams.get('q') ?? '';
    return json({ elections: await listElections(q.slice(0, 100)), source: 'database' });
  });
}
