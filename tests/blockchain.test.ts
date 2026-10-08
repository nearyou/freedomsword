import { expect, it } from 'vitest';
import { MockBlockchainAdapter } from '../src/server/blockchain';
it('accepts commitments only and returns idempotent mock receipts', async () => {
  const adapter = new MockBlockchainAdapter();
  const commitment = 'a'.repeat(64);
  expect(await adapter.submit(commitment)).toEqual(await adapter.submit(commitment));
  expect((await adapter.submit(commitment)).receipt).toMatch(/^mock:[a-f0-9]{64}$/);
  await expect(adapter.submit('{"telegramId":"123","vote":"maya"}')).rejects.toThrow();
});
