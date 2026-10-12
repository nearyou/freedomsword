import { Search } from 'lucide-react';
import type { CandidateView, ElectionView } from '@/shared/contracts';
import { searchCandidates } from '@/shared/contracts';
import CandidateCard from './CandidateCard';
import CandidateSearch from './CandidateSearch';
export default function CandidateList({
  election,
  onProfile,
  query,
  onQuery,
  sort,
  onSort,
}: {
  election: ElectionView;
  onProfile: (candidate: CandidateView) => void;
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
            onProfile={onProfile}
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
