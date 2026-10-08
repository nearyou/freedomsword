import { expect, it } from 'vitest';
import { ballotPseudonym, sha256, saltedCommitment, chainHash } from '../src/lib/hash';
it('uses a SHA-256 standard vector', () => {
  expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
it('separates ballot keys by election', () => {
  expect(ballotPseudonym('voter', 'a', 'secret')).not.toBe(ballotPseudonym('voter', 'b', 'secret'));
});
it('salts low-entropy public commitments', () => {
  expect(saltedCommitment('CAST:maya:100')).not.toBe(saltedCommitment('CAST:maya:100'));
});
it('binds each audit hash to the previous hash', () => {
  expect(chainHash('a', 'b')).not.toBe(chainHash('c', 'b'));
});
