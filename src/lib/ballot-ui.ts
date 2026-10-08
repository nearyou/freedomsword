import type { BallotView } from './ui';
import type { ElectionView } from './contracts';
export function supportSegments(balance: number, partialAmount: number) {
  const step = Math.min(100, Math.max(1, Math.floor(partialAmount) || 100));
  return Array.from({ length: Math.ceil(100 / step) }, (_, index) => {
    const start = index * step;
    const units = Math.min(step, 100 - start);
    return { units, fill: (Math.max(0, Math.min(units, balance - start)) / units) * 100 };
  });
}
export function recallAvailability(election: ElectionView, ballot: BallotView, now: number) {
  const policy = election.recallPolicy;
  const first =
    ballot.castAt === undefined
      ? undefined
      : new Date(ballot.castAt).getTime() + (policy?.firstDelaySeconds ?? 0) * 1000;
  const cooldown = ballot.lastRecallAt
    ? new Date(ballot.lastRecallAt).getTime() + (policy?.cooldownSeconds ?? 0) * 1000
    : undefined;
  const nextAt =
    first === undefined
      ? undefined
      : Math.max(first, cooldown ?? first, new Date(election.opensAt).getTime());
  const limitReached =
    ballot.recallCount !== undefined &&
    policy?.maxOperations != null &&
    ballot.recallCount >= policy.maxOperations;
  const common =
    ballot.balance === 0
      ? 'All support has been recalled. Another initial ballot is not allowed.'
      : policy?.enabled === false
        ? 'Recall is disabled for this election.'
        : election.status !== 'ACTIVE' ||
            now < new Date(election.opensAt).getTime() ||
            now >= new Date(election.closesAt).getTime()
          ? 'Recall is only available during the active election window.'
          : limitReached
            ? 'The maximum number of recall operations has been reached.'
            : nextAt !== undefined && now < nextAt
              ? 'The recall delay or cooldown has not elapsed.'
              : '';
  return {
    nextAt,
    common,
    partialReason:
      common ||
      (policy?.partialEnabled === false
        ? 'Partial recall is disabled.'
        : ballot.balance < (policy?.partialAmount ?? 25)
          ? 'The remaining balance is below the partial recall amount.'
          : ''),
    fullReason: common || (policy?.fullEnabled === false ? 'Full recall is disabled.' : ''),
  };
}
