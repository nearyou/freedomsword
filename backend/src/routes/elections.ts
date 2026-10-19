import { handle, json } from '@backend/http';
import { listElections } from '@backend/elections';
import { cachedElections } from '@backend/election-cache';
export async function GET(request: Request) {
  return handle(async () => {
    const q = (new URL(request.url).searchParams.get('q') ?? '').slice(0, 100);
    return json(await cachedElections(q, () => listElections(q)));
  });
}
