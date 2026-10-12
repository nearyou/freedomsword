import { Search, X } from 'lucide-react';
export default function CandidateSearch({
  query,
  onQuery,
  sort,
  onSort,
}: {
  query: string;
  onQuery: (query: string) => void;
  sort: string;
  onSort: (sort: string) => void;
}) {
  return (
    <div className="search-row">
      <label className="search-field">
        <Search size={18} />
        <input
          aria-label="Search candidates by full name"
          placeholder="Search by full name…"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
        {query && (
          <button aria-label="Clear search" onClick={() => onQuery('')}>
            <X size={16} />
          </button>
        )}
      </label>
      <select
        aria-label="Sort candidates"
        value={sort}
        onChange={(event) => onSort(event.target.value)}
      >
        <option value="support">Most support</option>
        <option value="name">Name A–Z</option>
      </select>
    </div>
  );
}
