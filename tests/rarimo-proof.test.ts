import { describe, expect, it } from 'vitest';
import { compactRarimoProof, encodeRarimoDate, rarimoEventId } from '../backend/src/rarimo-private-chain';

describe('Rarimo proof transport', () => {
  it('encodes the UTC proof date as the circuit ASCII date field', () => {
    expect(encodeRarimoDate(new Date('2026-10-14T23:59:59Z')))
      .toEqual({ digits: '261014', encoded: 0x323631303134n });
  });

  it('maps RariMe Groth16 points to the verifier coordinate order', () => {
    const converted = compactRarimoProof({
      pubSignals: Array.from({ length: 23 }, (_, index) => String(index + 1)),
      proof: { piA: ['101', '102', '1'],
        piB: [['201', '202'], ['203', '204'], ['1', '0']],
        piC: ['301', '302', '1'] },
    });
    expect(converted.a).toEqual([101n, 102n]);
    expect(converted.b).toEqual([[202n, 201n], [204n, 203n]]);
    expect(converted.c).toEqual([301n, 302n]);
    expect(converted.signals).toHaveLength(23);
    expect(() => compactRarimoProof({ pubSignals: ['1'],
      proof: { piA: ['1', '2'], piB: [['1', '2'], ['3', '4']], piC: ['1', '2'] } }))
      .toThrow('Invalid Rarimo proof format');
  });

  it('gives different elections different nullifier domains', () => {
    expect(rarimoEventId('00000000-0000-0000-0000-000000000001'))
      .not.toBe(rarimoEventId('00000000-0000-0000-0000-000000000002'));
  });
});
