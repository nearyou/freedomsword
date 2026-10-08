export const VOTE_UNITS = 100;
export const RECALL_STEP = 25;
export function recallUnits(balance: number, mode: 'partial' | 'full'): number {
  if (!Number.isInteger(balance) || balance <= 0 || balance > 100 || balance % 25 !== 0)
    throw new Error('No recallable balance');
  return mode === 'partial' ? RECALL_STEP : balance;
}
