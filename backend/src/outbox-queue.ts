import { Queue } from 'bullmq';
import { settleOutbox } from './blockchain';
import { redisClient } from './redis';

export const outboxQueueName = 'freedomsword-outbox';
let queue: Queue | null = null;

/** Ballots are already committed to MongoDB before this is called. */
export async function afterCommittedOutbox() {
  if (process.env.OUTBOX_PROCESSING !== 'worker') {
    await settleOutbox();
    return;
  }
  const redis = redisClient();
  if (!redis) return; // The worker also polls the durable MongoDB outbox.
  try {
    queue ??= new Queue(outboxQueueName, { connection: redis });
    await queue.add('drain', {}, { removeOnComplete: 1_000, removeOnFail: 1_000 });
  } catch { /* A Redis failure cannot erase the MongoDB outbox entry. */ }
}
