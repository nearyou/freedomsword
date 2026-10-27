import type { Election } from '@prisma/client';
import { ApiError } from './errors';

export type RecallPolicy = Pick<Election,
  'recallEnabled' | 'fullRecallEnabled' | 'partialRecallEnabled' | 'partialRecallAmount' |
  'firstRecallDelaySeconds' | 'recallCooldownSeconds' | 'maxRecallOperations'>;

export function permittedRecallAmount(
  policy: RecallPolicy,
  balance: number,
  mode: 'partial' | 'full',
  castAt: Date,
  previousRecalls: Date[],
  now: Date,
) {
  if (balance <= 0) throw new ApiError(409, 'Your ballot is already fully recalled', 'RECALL_EMPTY');
  if (!policy.recallEnabled) throw new ApiError(409, 'Recall is disabled for this election', 'RECALL_DISABLED');
  if (mode === 'full' && !policy.fullRecallEnabled)
    throw new ApiError(409, 'Full recall is disabled for this election', 'RECALL_MODE_DISABLED');
  if (mode === 'partial' && !policy.partialRecallEnabled)
    throw new ApiError(409, 'Partial recall is disabled for this election', 'RECALL_MODE_DISABLED');
  if (policy.maxRecallOperations !== null && previousRecalls.length >= policy.maxRecallOperations)
    throw new ApiError(409, 'Recall operation limit reached', 'RECALL_LIMIT');
  if (now.getTime() - castAt.getTime() < policy.firstRecallDelaySeconds * 1000)
    throw new ApiError(409, 'First recall delay has not elapsed', 'RECALL_DELAY');
  const last = previousRecalls[0];
  if (last && now.getTime() - last.getTime() < policy.recallCooldownSeconds * 1000)
    throw new ApiError(409, 'Recall cooldown has not elapsed', 'RECALL_COOLDOWN');
  const amount = mode === 'full' ? balance : policy.partialRecallAmount;
  if (amount > balance) throw new ApiError(409, 'Remaining balance is below the partial recall amount', 'RECALL_AMOUNT');
  return amount;
}
