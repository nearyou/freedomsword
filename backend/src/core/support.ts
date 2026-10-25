export const SUPPORT_BUDGET = 100;
export const SUPPORT_COOLDOWN_MONTHS = 6;

/** Same UTC time six calendar months later, clamped to the target month's last day. */
export function supportUnlockAt(withdrawnAt: Date) {
  const result = new Date(withdrawnAt);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + SUPPORT_COOLDOWN_MONTHS);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function supportBalance(
  allocations: { candidateId: string; units: number }[],
  withdrawals: { units: number; availableAt: Date }[],
  now: Date,
) {
  const valid = (units: number) => Number.isInteger(units) && units >= 0 && units <= SUPPORT_BUDGET;
  const activeUnits = allocations.reduce((sum, entry) => sum + entry.units, 0);
  const cooling = withdrawals.filter((entry) => entry.availableAt > now);
  const coolingUnits = cooling.reduce((sum, entry) => sum + entry.units, 0);
  if (!allocations.every((entry) => valid(entry.units)) || !withdrawals.every((entry) => valid(entry.units)) ||
    activeUnits + coolingUnits > SUPPORT_BUDGET)
    throw new Error('Support budget integrity check failed');
  return { totalUnits: SUPPORT_BUDGET, activeUnits, coolingUnits,
    availableUnits: SUPPORT_BUDGET - activeUnits - coolingUnits,
    cooldownMonths: SUPPORT_COOLDOWN_MONTHS,
    allocations: allocations.filter((entry) => entry.units > 0),
    withdrawals: cooling.map((entry) => ({ units: entry.units, availableAt: entry.availableAt.toISOString() })) };
}
