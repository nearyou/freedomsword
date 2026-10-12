import type { ElectionStatus } from '@prisma/client';

export function effectiveElectionStatus(
  election: { status: ElectionStatus; opensAt: Date; closesAt: Date },
  now: Date,
): ElectionStatus {
  if (election.status === 'DRAFT' || election.status === 'ARCHIVED' || election.status === 'FINISHED')
    return election.status;
  if (now >= election.closesAt) return 'FINISHED';
  if (now < election.opensAt) return 'UPCOMING';
  return 'ACTIVE';
}
