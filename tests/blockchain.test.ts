import { expect, it } from 'vitest';
import { MockBlockchainAdapter, flushOutbox, reconcileOutbox, type BlockchainAdapter } from '../backend/src/blockchain';
import { retryDelayMs, type ClaimedCommitment, type CommitmentOutboxStore, type SubmittedCommitment } from '../backend/src/outbox-store';
import { ChainRejectedError, classifyRevert } from '../backend/src/chain/rejection';
it('accepts commitments only and returns idempotent mock receipts', async () => {
  const adapter = new MockBlockchainAdapter();
  const commitment = 'a'.repeat(64);
  expect(await adapter.submit(commitment)).toEqual(await adapter.submit(commitment));
  expect((await adapter.submit(commitment)).receipt).toMatch(/^mock:[a-f0-9]{64}$/);
  await expect(adapter.submit('{"telegramId":"123","vote":"maya"}')).rejects.toThrow();
});

it('does not call a submitted Sepolia commitment confirmed until its receipt is mined', async () => {
  const commitment = 'b'.repeat(64);
  const claim: ClaimedCommitment = { id: 'audit-1', commitment, claimToken: 'lease-1' };
  let available = true;
  let saved: SubmittedCommitment | null = null;
  let confirmed = false;
  let chainState: 'pending' | 'confirmed' = 'pending';
  const store: CommitmentOutboxStore = {
    async claimBatch() { if (!available) return []; available = false; return [claim]; },
    async complete(record, receipt, mined) {
      expect(record).toEqual(claim);
      expect(mined).toBe(false);
      saved = { id: record.id, commitment: record.commitment, receipt };
      return true;
    },
    async fail() { throw new Error('Unexpected outbox failure'); },
    async reject() { throw new Error('Unexpected outbox rejection'); },
    async submittedBatch() { return saved && !confirmed ? [saved] : []; },
    async finalizeSubmitted(_record, outcome) { confirmed = outcome === 'confirmed'; return true; },
  };
  const adapter: BlockchainAdapter = {
    name: 'SEPOLIA',
    async submit() { return { receipt: `sepolia:0x${'c'.repeat(64)}` }; },
    async confirm() { return chainState; },
  };
  expect(await flushOutbox(adapter, 1, store)).toMatchObject({ submitted: 1, confirmed: 0 });
  expect(await reconcileOutbox(adapter, 1, store)).toEqual({ checked: 1, confirmed: 0 });
  chainState = 'confirmed';
  expect(await reconcileOutbox(adapter, 1, store)).toEqual({ checked: 1, confirmed: 1 });
  expect(confirmed).toBe(true);
});

function recordingStore(overrides: Partial<CommitmentOutboxStore> = {}) {
  const calls: string[] = [];
  const store: CommitmentOutboxStore = {
    async claimBatch() { return [{ id: 'a', commitment: 'e'.repeat(64), claimToken: 't', attempts: 1 }]; },
    async complete() { calls.push('complete'); return true; },
    async fail() { calls.push('fail'); return true; },
    async reject() { calls.push('reject'); return true; },
    async submittedBatch() { return []; },
    async finalizeSubmitted(_record, outcome) { calls.push(`finalize:${outcome}`); return true; },
    ...overrides,
  };
  return { store, calls };
}
const failing = (error: Error): BlockchainAdapter => ({
  name: 'SEPOLIA', async submit() { throw error; },
});

it('settles an action the contract rejects so it stops blocking the queue', async () => {
  const { store, calls } = recordingStore();
  await flushOutbox(failing(new ChainRejectedError('ElectionUnavailable', false)), 1, store);
  expect(calls).toEqual(['reject']);
});

it('retries a time-dependent rejection with backoff, then gives up after repeated attempts', async () => {
  const early = recordingStore();
  await flushOutbox(failing(new ChainRejectedError('RecallUnavailable', true)), 1, early.store);
  expect(early.calls).toEqual(['fail']);
  const late = recordingStore({
    async claimBatch() { return [{ id: 'a', commitment: 'e'.repeat(64), claimToken: 't', attempts: 8 }]; },
  });
  await flushOutbox(failing(new ChainRejectedError('RecallUnavailable', true)), 1, late.store);
  expect(late.calls).toEqual(['reject']);
});

it('retries an RPC failure instead of rejecting the action', async () => {
  const { store, calls } = recordingStore();
  await flushOutbox(failing(new Error('network down')), 1, store);
  expect(calls).toEqual(['fail']);
});

it('resubmits a transaction that stays pending past the stale limit', async () => {
  const adapter: BlockchainAdapter = {
    name: 'SEPOLIA', async submit() { return { receipt: '' }; }, async confirm() { return 'pending'; },
  };
  const record = (age: number) => ({ id: 'a', commitment: 'e'.repeat(64), receipt: 'sepolia:0x' + 'c'.repeat(64),
    submittedAt: new Date(Date.now() - age) });
  const fresh = recordingStore({ async submittedBatch() { return [record(60_000)]; } });
  await reconcileOutbox(adapter, 1, fresh.store);
  expect(fresh.calls).toEqual([]);
  const stale = recordingStore({ async submittedBatch() { return [record(11 * 60_000)]; } });
  await reconcileOutbox(adapter, 1, stale.store);
  expect(stale.calls).toEqual(['finalize:failed']);
});

it('backs off retries exponentially up to fifteen minutes', () => {
  expect(retryDelayMs(1)).toBe(15_000);
  expect(retryDelayMs(3)).toBe(60_000);
  expect(retryDelayMs(30)).toBe(15 * 60_000);
});

it('classifies contract reverts by whether retrying can help', () => {
  expect(classifyRevert('BallotMissing')).toMatchObject({ retryable: false });
  expect(classifyRevert('RecallUnavailable')).toMatchObject({ retryable: true });
  expect(classifyRevert('Unauthorized')).toBeNull();
});
