import 'dotenv/config';
import { flushOutbox } from '../src/server/blockchain';
import { db } from '../src/server/db';
import { recordOperational } from '../src/server/observability';

let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });
const delayMs = Math.min(Math.max(Number(process.env.OUTBOX_POLL_MS ?? 5000) || 5000, 1000), 60000);
async function main() {
  while (!stopping) {
    try { await flushOutbox(); }
    catch { recordOperational('outbox', 'failure', 'dependency'); }
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
main().finally(() => db.$disconnect());
