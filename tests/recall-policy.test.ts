import { describe, expect, it } from 'vitest';
import { permittedRecallAmount } from '../src/server/recall-policy';

const policy = {
  recallEnabled: true, fullRecallEnabled: true, partialRecallEnabled: true,
  partialRecallAmount: 25, firstRecallDelaySeconds: 0,
  recallCooldownSeconds: 0, maxRecallOperations: null,
};
const castAt = new Date('2030-01-01T00:00:00Z');
const now = new Date('2030-01-01T01:00:00Z');
describe('recall policy', () => {
  it('preserves 100 → 75 → 50 → 25 → 0 defaults', () => {
    for (const balance of [100, 75, 50, 25])
      expect(permittedRecallAmount(policy, balance, 'partial', castAt, [], now)).toBe(25);
    expect(() => permittedRecallAmount(policy, 0, 'partial', castAt, [], now)).toThrow('fully recalled');
  });
  it('enforces modes, delay, cooldown, operation count and partial balance', () => {
    expect(() => permittedRecallAmount({ ...policy, recallEnabled: false }, 100, 'full', castAt, [], now)).toThrow('disabled');
    expect(() => permittedRecallAmount({ ...policy, fullRecallEnabled: false }, 100, 'full', castAt, [], now)).toThrow('disabled');
    expect(() => permittedRecallAmount({ ...policy, partialRecallEnabled: false }, 100, 'partial', castAt, [], now)).toThrow('disabled');
    expect(() => permittedRecallAmount({ ...policy, firstRecallDelaySeconds: 3601 }, 100, 'partial', castAt, [], now)).toThrow('delay');
    expect(() => permittedRecallAmount({ ...policy, recallCooldownSeconds: 10 }, 75, 'partial', castAt, [new Date(now.getTime() - 9000)], now)).toThrow('cooldown');
    expect(() => permittedRecallAmount({ ...policy, maxRecallOperations: 1 }, 75, 'partial', castAt, [now], now)).toThrow('limit');
    expect(() => permittedRecallAmount({ ...policy, partialRecallAmount: 30 }, 10, 'partial', castAt, [], now)).toThrow('below');
    expect(permittedRecallAmount({ ...policy, partialRecallAmount: 30 }, 10, 'full', castAt, [], now)).toBe(10);
  });
});
