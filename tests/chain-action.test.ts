import { describe, expect, it } from 'vitest';
import { decodeFunctionData, type Abi } from 'viem';
import abiJson from '../backend/src/chain/abi.json';
import { chainActionSchema, electionChainConfig } from '../backend/src/chain/action';
import { encodeChainAction } from '../backend/src/sepolia';

const abi = abiJson as Abi;
const key = `0x${'a'.repeat(64)}`;
const nullifier = `0x${'b'.repeat(64)}`;
const choice = `0x${'c'.repeat(64)}`;
const audit = 'd'.repeat(64);
const config = electionChainConfig({
  opensAt: new Date('2032-01-01T00:00:00Z'),
  closesAt: new Date('2032-02-01T00:00:00Z'),
  recallEnabled: true, fullRecallEnabled: true, partialRecallEnabled: true,
  partialRecallAmount: 30, firstRecallDelaySeconds: 5,
  recallCooldownSeconds: 10, maxRecallOperations: 3,
});

describe('Ethereum action encoding', () => {
  it('encodes a selected amount without reducing it to a boolean full/partial call', () => {
    const input = encodeChainAction(audit, JSON.stringify({
      kind: 'RECALL_AMOUNT', electionKey: key, nullifier, units: 75, config,
    }));
    const decoded = decodeFunctionData({ abi, data: input });
    expect(decoded.functionName).toBe('recallVoteAmount');
    expect(decoded.args).toEqual([key, nullifier, 75, `0x${audit}`]);
  });
  it('encodes a cast and recall with only opaque keys and the real recall policy', () => {
    const cast = chainActionSchema.parse({
      kind: 'CAST', electionKey: key, nullifier, candidateCommitment: choice, config,
    });
    const castInput = encodeChainAction(audit, JSON.stringify(cast));
    const decodedCast = decodeFunctionData({ abi, data: castInput });
    expect(decodedCast.functionName).toBe('castVote');
    expect(decodedCast.args?.[0]).toBe(key);
    expect(decodedCast.args?.[1]).toBe(nullifier);
    expect(decodedCast.args?.[3]).toBe(`0x${audit}`);
    expect((decodedCast.args?.[6] as { partialAmount: number }).partialAmount).toBe(30);
    expect(castInput).not.toContain('telegram');
    const recallInput = encodeChainAction(audit, JSON.stringify({
      kind: 'RECALL', electionKey: key, nullifier, full: true, config,
    }));
    expect(decodeFunctionData({ abi, data: recallInput }).functionName).toBe('recallVote');
    const closeInput = encodeChainAction(audit, JSON.stringify({ kind: 'CLOSE', electionKey: key }));
    expect(decodeFunctionData({ abi, data: closeInput }).functionName).toBe('closeElection');
  });

  it('rejects malformed actions before they reach a relayer', () => {
    expect(() => encodeChainAction(audit, JSON.stringify({
      kind: 'CAST', electionKey: 'council-2026', nullifier, candidateCommitment: choice, config,
    }))).toThrow();
    expect(() => encodeChainAction('invalid')).toThrow('Invalid audit commitment');
  });
});
