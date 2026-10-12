import { z } from 'zod';
import { sha256 } from '@/shared/hash';
import { commitmentOutboxStore, type CommitmentOutboxStore } from './outbox-store';
import { recordOperational } from './observability';
import { SepoliaBlockchainAdapter } from './sepolia';
export interface BlockchainAdapter {
  readonly name: string;
  submit(commitment: string, actionJson?: string | null): Promise<{ receipt: string }>;
  confirm?(receipt: string, commitment: string, actionJson?: string | null): Promise<'pending' | 'confirmed' | 'failed'>;
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
export function configuredBlockchainAdapter(): BlockchainAdapter {
  return process.env.BLOCKCHAIN_ADAPTER === 'sepolia'
    ? new SepoliaBlockchainAdapter()
    : new MockBlockchainAdapter();
}
export async function flushOutbox(
  adapter: BlockchainAdapter = configuredBlockchainAdapter(),
  limit = 10,
  store: CommitmentOutboxStore = commitmentOutboxStore,
) {
  const records = await store.claimBatch(Math.min(Math.max(limit, 1), 10), 60_000);
  let confirmed = 0;
  let submitted = 0;
  for (const record of records) {
    try {
      const result = await adapter.submit(record.commitment, record.actionJson);
      const mined = adapter.name === 'MOCK';
      if (mined ? !/^mock:[a-f0-9]{64}$/.test(result.receipt)
        : !/^sepolia:0x[a-f0-9]{64}$/.test(result.receipt))
        throw new Error('Invalid blockchain receipt');
      if (await store.complete(record, result.receipt, mined, adapter.name)) {
        if (mined) confirmed++;
        else submitted++;
        recordOperational('outbox', 'success', 'none');
      }
    } catch {
      await store.fail(record);
      recordOperational('outbox', 'failure', 'dependency');
    }
  }
  return { processed: records.length, confirmed, submitted, adapter: adapter.name };
}
export async function reconcileOutbox(
  adapter: BlockchainAdapter = configuredBlockchainAdapter(),
  limit = 10,
  store: CommitmentOutboxStore = commitmentOutboxStore,
) {
  if (!adapter.confirm) return { checked: 0, confirmed: 0 };
  const records = await store.submittedBatch(Math.min(Math.max(limit, 1), 10));
  let confirmed = 0;
  for (const record of records) {
    try {
      const status = await adapter.confirm(record.receipt, record.commitment, record.actionJson);
      if (status === 'pending') continue;
      if (await store.finalizeSubmitted(record, status === 'confirmed') && status === 'confirmed')
        confirmed++;
    } catch {
      recordOperational('outbox', 'failure', 'dependency');
    }
  }
  return { checked: records.length, confirmed };
}
export async function processOutbox(adapter: BlockchainAdapter = configuredBlockchainAdapter()) {
  const sent = await flushOutbox(adapter, adapter.name === 'MOCK' ? 10 : 1);
  const mined = await reconcileOutbox(adapter);
  return { ...sent, mined };
}
export async function settleOutbox() {
  try {
    await processOutbox();
  } catch {
    /* The committed action remains valid; retry the outbox separately. */
  }
}
