import { expect, it } from 'vitest';
import { legacyRecallSelection, supportAdjustment, supportScale, swipedSupport } from '../frontend/src/lib/support-adjustment';

it('shows four equal quarters with the exact kept, added, recalled and unavailable units', () => {
  const adding = supportScale(50, 75, 100);
  expect(adding).toHaveLength(4);
  expect(adding[0].retained).toBe(25);
  expect(adding[1].retained).toBe(25);
  expect(adding[2].added).toBe(25);
  expect(adding[3].available).toBe(25);
  const recalling = supportScale(100, 75, 100);
  expect(recalling[3].removed).toBe(25);
  expect(recalling.reduce((sum, section) => sum + section.retained, 0)).toBe(75);
  expect(supportScale(75, 75, 75)[3].unavailable).toBe(25);
  for (const [current, target, maximum] of [[0, 0, 100], [0, 100, 100], [100, 0, 100], [73, 27, 100], [40, 55, 55]]) {
    const sections = supportScale(current, target, maximum);
    expect(sections).toHaveLength(4);
    for (const section of sections) expect(Object.values(section).reduce((sum, units) => sum + units, 0)).toBe(25);
    expect(sections.reduce((sum, section) => sum + section.retained + section.added, 0)).toBe(target);
    expect(sections.reduce((sum, section) => sum + section.removed, 0)).toBe(Math.max(0, current - target));
  }
});

it('uses each horizontal swipe to subtract or add one quarter vote, down to zero', () => {
  let support = 100;
  for (const expected of [75, 50, 25, 0, 0]) {
    support = swipedSupport(support, 100, -70, 4);
    expect(support).toBe(expected);
  }
  for (const expected of [25, 50, 75, 100, 100]) {
    support = swipedSupport(support, 100, 70, 4);
    expect(support).toBe(expected);
  }
  expect(swipedSupport(50, 100, 1000, 2)).toBe(75);
});

it('ignores taps and vertical scrolling, and never adds cooling or unavailable units', () => {
  expect(swipedSupport(50, 100, 10, 0)).toBe(50);
  expect(swipedSupport(50, 100, 40, 80)).toBe(50);
  expect(swipedSupport(50, 50, 70, 0)).toBe(50);
  expect(swipedSupport(40, 55, 70, 0)).toBe(55);
  expect(swipedSupport(17, 100, -70, 0)).toBe(0);
});

it('turns draft support into the exact mutation, including a full recall after a partial recall', () => {
  expect(supportAdjustment(100, 75, 0)).toEqual({ action: 'withdraw', units: 25 });
  expect(supportAdjustment(75, 0, 0)).toEqual({ action: 'withdraw', units: 75 });
  expect(supportAdjustment(0, 25, 100)).toEqual({ action: 'allocate', units: 25 });
  expect(supportAdjustment(25, 100, 75)).toEqual({ action: 'allocate', units: 75 });
  for (const target of [50, -25, 125, 25.5]) expect(supportAdjustment(25, target, 0)).toBeNull();
  expect(supportAdjustment(75, 75, 25)).toBeNull();
});

it('routes legacy recalls to their existing permitted endpoint without changing election rules', () => {
  const policy = { fullEnabled: true, partialEnabled: true, partialAmount: 25 };
  expect(legacyRecallSelection(100, 75, policy)).toEqual({ mode: 'partial' });
  expect(legacyRecallSelection(100, 50, policy)).toEqual({ mode: 'partial', units: 50 });
  expect(legacyRecallSelection(75, 0, policy)).toEqual({ mode: 'full' });
  expect(legacyRecallSelection(17, 0, policy)).toEqual({ mode: 'full' });
  expect(legacyRecallSelection(100, 100, policy)).toBeNull();
  expect(legacyRecallSelection(100, 75, { ...policy, partialEnabled: false })).toBeNull();
  expect(legacyRecallSelection(100, 0, { ...policy, fullEnabled: false })).toBeNull();
  expect(legacyRecallSelection(100, 70, { ...policy, partialAmount: 30 })).toEqual({ mode: 'partial' });
  expect(legacyRecallSelection(100, 75, { ...policy, partialAmount: 30 })).toBeNull();
});
