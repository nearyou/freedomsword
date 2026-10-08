import { describe, expect, it } from 'vitest';
import { recallUnits } from '../src/lib/rules';
describe('vote units', () => {
  it('recalls 100 → 75 → 50 → 25 → 0', () => {
    let balance = 100;
    for (const expected of [75, 50, 25, 0]) {
      balance -= recallUnits(balance, 'partial');
      expect(balance).toBe(expected);
    }
    expect(() => recallUnits(balance, 'partial')).toThrow();
  });
  it('fully recalls remaining balance', () => {
    expect(recallUnits(75, 'full')).toBe(75);
  });
  it.each([-25, 0, 10, 125, NaN])('rejects invalid balance %s', (balance) => {
    expect(() => recallUnits(balance, 'partial')).toThrow();
  });
});
