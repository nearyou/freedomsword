import type { CandidateView, CitizenView, ElectionView } from './contracts';
export type BallotView = CitizenView['votes'][number];
export type AppTab = 'Candidates' | 'Live results' | 'My ballot' | 'Accountability';
export const electionLabels: Record<string, string> = {
  COUNCIL: 'City council',
  BUDGET: 'Budget delegate',
  COMMUNITY: 'Community representative',
};
export const count = (value: number) => value.toLocaleString('en-US');
export const support = (candidate: CandidateView, election: ElectionView) =>
  election.activeUnits ? (candidate.units / election.activeUnits) * 100 : 0;
export const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
export const timeLabel = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    timeZoneName: 'short',
  });
export function electionOpen(election: ElectionView, now = Date.now()) {
  return (
    election.status === 'ACTIVE' &&
    new Date(election.opensAt).getTime() <= now &&
    new Date(election.closesAt).getTime() > now
  );
}
export function voteExplanation(election: ElectionView, ballot?: BallotView, busy = false) {
  if (busy) return 'An action is being recorded.';
  if (ballot) return 'One initial ballot per election. Recalled units cannot be reassigned.';
  if (!electionOpen(election))
    return election.status === 'UPCOMING'
      ? 'Voting opens at the scheduled start.'
      : 'This election is closed for voting.';
  return '';
}
