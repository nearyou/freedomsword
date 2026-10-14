import { describe, expect, it } from 'vitest';
import { requireLegacyBallotProtocol } from '../backend/src/core/protocol';

describe('private-election isolation', () => {
  it('rejects legacy cast and recall operations for a MACI election', () => {
    expect(() => requireLegacyBallotProtocol('MACI_PRIVATE')).toThrowError(
      /legacy ballot API is unavailable/,
    );
  });

  it('keeps legacy elections, including older records without a protocol field, usable', () => {
    expect(() => requireLegacyBallotProtocol('LEGACY_RECALL')).not.toThrow();
    expect(() => requireLegacyBallotProtocol(undefined)).not.toThrow();
    expect(() => requireLegacyBallotProtocol('UNKNOWN')).toThrow();
  });
});
