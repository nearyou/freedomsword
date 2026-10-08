import { expect, it } from 'vitest';
import { verifyAuditSegment } from '../src/lib/audit-chain';
import { chainHash, saltedCommitment } from '../src/lib/hash';
it('detects hash tampering, missing links and sequence reversals', () => {
  const commitment = saltedCommitment('private action');
  const first = {
    sequence: 1,
    commitment,
    previousHash: '0'.repeat(64),
    hash: chainHash('0'.repeat(64), commitment),
  };
  const second = {
    sequence: 3,
    commitment: saltedCommitment('next'),
    previousHash: first.hash,
    hash: '',
  };
  second.hash = chainHash(second.previousHash, second.commitment);
  expect(verifyAuditSegment([first, second], '0'.repeat(64))).toBe(true);
  expect(verifyAuditSegment([{ ...first, commitment: 'a'.repeat(64) }], '0'.repeat(64))).toBe(
    false,
  );
  expect(verifyAuditSegment([second], '0'.repeat(64))).toBe(false);
  expect(verifyAuditSegment([second, first], first.hash)).toBe(false);
});
