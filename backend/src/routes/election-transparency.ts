import { electionTransparency } from '@backend/transparency';
import { handle, json } from '@backend/http';
export async function GET(_request: Request, id: string) {
  return handle(async () => {
    return json(await electionTransparency(id));
  });
}
