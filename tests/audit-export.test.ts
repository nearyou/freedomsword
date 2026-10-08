import { describe, expect, it } from 'vitest';
import { canonicalJson, hashAuditBundle, verifyAuditExport } from '../src/lib/audit-export';
import { chainHash } from '../src/lib/hash';

describe('audit export verification', () => {
  const commitment = 'a'.repeat(64);
  const previousHash = '0'.repeat(64);
  const event = { sequence: 1, commitment, previousHash, hash: chainHash(previousHash, commitment) };
  const bundle = {
    schemaVersion: 'dynamic-democracy-audit-bundle/v1',
    publicAuditChain: [event],
    aggregates: { voteUnitsCast: 100, recalledUnits: 25, activeUnits: 75 },
    candidates: [{ activeUnits: 75 }],
  };
  it('hashes JSON independently of object-key insertion order', () => {
    expect(canonicalJson({ b: 2, a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4},"b":2}');
    expect(hashAuditBundle({ a: 1, b: 2 })).toBe(hashAuditBundle({ b: 2, a: 1 }));
  });
  it('checks the full bundle hash, global chain and arithmetic', () => {
    const exportValue = { algorithm: 'SHA-256', sha256: hashAuditBundle(bundle), bundle };
    expect(verifyAuditExport(exportValue)).toBe(true);
    expect(verifyAuditExport({ ...exportValue, sha256: 'f'.repeat(64) })).toBe(false);
    const tampered = { ...bundle, publicAuditChain: [{ ...event, hash: 'b'.repeat(64) }] };
    expect(verifyAuditExport({ ...exportValue, bundle: tampered, sha256: hashAuditBundle(tampered) })).toBe(false);
    const arithmetic = { ...bundle, aggregates: { ...bundle.aggregates, activeUnits: 80 } };
    expect(verifyAuditExport({ ...exportValue, bundle: arithmetic, sha256: hashAuditBundle(arithmetic) })).toBe(false);
  });
});
