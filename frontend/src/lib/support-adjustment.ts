export const QUARTER_VOTE_UNITS = 25;

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
