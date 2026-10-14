import { describe, expect, it } from 'vitest';
import { checkedPrivateTotals, localPrivateTestingEnabled } from '../backend/src/private-poll-chain';

describe('local MACI test gate environment', () => {
  it.each([
    [{ APP_ENV: 'development', NODE_ENV: 'development' }, true],
    [{ APP_ENV: 'test', NODE_ENV: 'test' }, true],
    [{ NODE_ENV: 'production' }, false],
    [{ APP_ENV: 'test', NODE_ENV: 'production' }, false],
    [{ APP_ENV: 'staging', NODE_ENV: 'development' }, false],
    [{ APP_ENV: 'production', NODE_ENV: 'development' }, false],
  ] as const)('allows local registration only in development or test: %#', (env, allowed) => {
    expect(localPrivateTestingEnabled(env)).toBe(allowed);
  });
});

describe('private result publication threshold', () => {
  it('accepts matching proof-backed totals only above the three-voter floor', () => {
    expect(checkedPrivateTotals([
      { value: 200n, isSet: true }, { value: 100n, isSet: true },
    ], 300n)).toEqual(['200', '100']);
    expect(() => checkedPrivateTotals([{ value: 200n, isSet: true }], 200n))
      .toThrow('At least three');
    expect(() => checkedPrivateTotals([{ value: 300n, isSet: false }], 300n))
      .toThrow('incomplete');
    expect(() => checkedPrivateTotals([{ value: 300n, isSet: true }], 400n))
      .toThrow('incomplete');
  });
});
