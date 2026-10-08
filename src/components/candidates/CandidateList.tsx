import { Search } from 'lucide-react';
import type { CandidateView, ElectionView } from '@/lib/contracts';
import { searchCandidates } from '@/lib/contracts';
import type { BallotView } from '@/lib/ui';
import CandidateCard from './CandidateCard';
import CandidateSearch from './CandidateSearch';
export default function CandidateList({
  election,
  ballot,
  busy,
  onProfile,
  onCast,
  query,
  onQuery,
  sort,
  onSort,
}: {
  election: ElectionView;
  ballot?: BallotView;
  busy: boolean;
  onProfile: (candidate: CandidateView) => void;
  onCast: (candidate: CandidateView) => void;
  query: string;
  onQuery: (query: string) => void;
  sort: string;
  onSort: (sort: string) => void;
}) {
  const candidates = [...searchCandidates(election.candidates, query)].sort((a, b) =>
    sort === 'name'
      ? a.fullName.localeCompare(b.fullName)
      : b.units - a.units || a.fullName.localeCompare(b.fullName),
  );
  return (
    <>
      <CandidateSearch query={query} onQuery={onQuery} sort={sort} onSort={onSort} />
      <div className="candidate-grid">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            election={election}
            ballot={ballot}
            busy={busy}
            onProfile={onProfile}
            onCast={onCast}
          />
        ))}
      </div>
      {!candidates.length && (
        <div className="panel empty-state">
          <Search size={28} />
          <h3>{query ? 'No candidates found' : 'No candidates published'}</h3>
          <p>
            {query
              ? 'Try another name or clear your search.'
              : 'Candidate information will appear here when available.'}
          </p>
          {query && (
            <button className="button secondary" onClick={() => onQuery('')}>
              Clear search
            </button>
          )}
        </div>
      )}
    </>
  );
}
