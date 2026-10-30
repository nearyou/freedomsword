export const QUARTER_VOTE_UNITS = 25;

/** Exact amounts between quarter marks use the next quarter's color. */
export function supportTone(units: number) {
  return units <= 0 ? 'gray' : units <= 25 ? 'red' : units <= 50 ? 'yellow' : units <= 75 ? 'green' : 'blue';
}

export const supportColors = { blue: '#55b4df', green: '#69d4b1', yellow: '#f1cc60', red: '#ef7b80', gray: '#788994' } as const;

/** Four equal visual sections distinguish saved support from a pending addition or recall. */
export function supportScale(current: number, target: number, maximum: number) {
  const overlap = (from: number, to: number, start: number, end: number) =>
    Math.max(0, Math.min(to, end) - Math.max(from, start));
  return Array.from({ length: 4 }, (_, index) => {
    const start = index * 25, end = start + 25;
    return {
      retained: overlap(0, Math.min(current, target), start, end),
      added: overlap(current, target, start, end),
      removed: overlap(target, current, start, end),
      available: overlap(Math.max(current, target), maximum, start, end),
      unavailable: overlap(maximum, 100, start, end),
    };
  });
}

export function clampSupport(value: number, maximum: number) {
  return Math.max(0, Math.min(Math.max(0, maximum), Math.round(value)));
}

/** One completed horizontal swipe changes the draft by one quarter, never a saved vote. */
export function swipedSupport(value: number, maximum: number, deltaX: number, deltaY: number) {
  if (Math.abs(deltaX) < 32 || Math.abs(deltaX) <= Math.abs(deltaY)) return value;
  return clampSupport(value + Math.sign(deltaX) * QUARTER_VOTE_UNITS, maximum);
}

export function supportAdjustment(current: number, target: number, available: number) {
  if (!Number.isInteger(target) || target < 0 || target > current + available || target > 100)
    return null;
  const delta = target - current;
  return delta === 0 ? null : { action: delta < 0 ? 'withdraw' as const : 'allocate' as const,
    units: Math.abs(delta) };
}

export function legacyRecallSelection(balance: number, target: number, policy?: {
  partialEnabled: boolean; fullEnabled: boolean; partialAmount: number;
}) {
  const units = balance - target;
  if (units <= 0 || units > balance) return null;
  if (units === balance && policy?.fullEnabled !== false) return { mode: 'full' as const };
  const step = policy?.partialAmount ?? 25;
  if (policy?.partialEnabled === false || units % step !== 0 ||
    (units !== step && ![25, 50, 75].includes(units))) return null;
  return { mode: 'partial' as const, ...(units === step ? {} : { units }) };
}
