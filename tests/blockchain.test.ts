import { expect, it } from 'vitest';
import { MockBlockchainAdapter, flushOutbox, reconcileOutbox, type BlockchainAdapter } from '../backend/src/blockchain';
import type { ClaimedCommitment, CommitmentOutboxStore, SubmittedCommitment } from '../backend/src/outbox-store';
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
    async submittedBatch() { return saved && !confirmed ? [saved] : []; },
    async finalizeSubmitted(_record, mined) { confirmed = mined; return true; },
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
