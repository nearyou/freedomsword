import 'dotenv/config';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { processOutbox } from '../src/blockchain';
import { db } from '../src/db';
import { recordOperational } from '../src/observability';
import { outboxQueueName } from '../src/outbox-queue';

let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });
const delayMs = Math.min(Math.max(Number(process.env.OUTBOX_POLL_MS ?? 5000) || 5000, 1000), 60000);
let active: Promise<unknown> | null = null;
function drain() {
  active ??= processOutbox().finally(() => { active = null; });
  return active;
}

async function main() {
  const connection = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null }) : null;
  const worker = connection ? new Worker(outboxQueueName, drain, {
    connection, concurrency: 1, limiter: { max: 1, duration: 1_000 },
  }) : null;
  worker?.on('error', () => recordOperational('outbox', 'failure', 'dependency'));
  while (!stopping) {
    try { await drain(); }
    catch { recordOperational('outbox', 'failure', 'dependency'); }
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  await worker?.close();
  await connection?.quit();
}
main().finally(() => db.$disconnect());
