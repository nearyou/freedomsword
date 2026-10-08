import { expect, it } from 'vitest';
import { MockVerificationProvider } from '../src/server/verification';
it('returns expiring mock receipts without echoing identity', async () => {
  const receipt = await new MockVerificationProvider().verify({ subjectKey: 'private-identity' });
  expect(receipt.verified).toBe(true);
  expect(receipt.receipt).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(receipt)).not.toContain('private-identity');
  expect(receipt.expiresAt.getTime()).toBeGreaterThan(Date.now());
});
