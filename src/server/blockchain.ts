import { z } from 'zod';
import { sha256 } from '@/lib/hash';
import { commitmentOutboxStore, type CommitmentOutboxStore } from './outbox-store';
import { recordOperational } from './observability';
export interface BlockchainAdapter {
  readonly name: string;
  submit(commitment: string): Promise<{ receipt: string }>;
}
export class MockBlockchainAdapter implements BlockchainAdapter {
  readonly name = 'MOCK';
  async submit(commitment: string) {
    z.string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(commitment);
    return { receipt: `mock:${sha256(`mock-receipt-v1:${commitment}`)}` };
  }
}
export async function flushOutbox(
  adapter: BlockchainAdapter = new MockBlockchainAdapter(),
  limit = 10,
  store: CommitmentOutboxStore = commitmentOutboxStore,
) {
  if (adapter.name !== 'MOCK') throw new Error('Only the mock blockchain adapter is enabled');
  const records = await store.claimBatch(Math.min(Math.max(limit, 1), 10), 60_000);
  let confirmed = 0;
  for (const record of records) {
    try {
      const result = await adapter.submit(record.commitment);
      if (!/^mock:[a-f0-9]{64}$/.test(result.receipt)) throw new Error('Invalid mock receipt');
      if (await store.complete(record, result.receipt)) {
        confirmed++;
        recordOperational('outbox', 'success', 'none');
      }
    } catch {
      await store.fail(record);
      recordOperational('outbox', 'failure', 'dependency');
    }
  }
  return { processed: records.length, confirmed, adapter: 'MOCK' };
}
export async function settleMockOutbox() {
  try {
    await flushOutbox();
  } catch {
    /* The committed action remains valid; retry the outbox separately. */
  }
}
