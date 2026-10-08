import { electionTransparency } from '@/server/transparency';
import { handle, json } from '@/server/http';
export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    return json(await electionTransparency(id));
  });
}
