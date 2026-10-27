import type { AppTab } from './ui';

const tabs: AppTab[] = ['Candidates', 'Live results', 'My ballot', 'Accountability'];
export function citizenLocation(query: Record<string, string | string[] | undefined>) {
  const tab = typeof query.tab === 'string' && tabs.includes(query.tab as AppTab)
    ? query.tab as AppTab : 'Candidates';
  const electionId = typeof query.election === 'string' && query.election.length <= 100
    ? query.election : undefined;
  return { tab, electionId };
}

export function personalBallotHref(electionId: string) {
  return `/elections?${new URLSearchParams({ election: electionId, tab: 'My ballot' })}`;
}
