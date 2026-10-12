import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, ChevronDown } from 'lucide-react';
import type { ElectionView } from '@/lib/contracts';
import { dateLabel, electionLabels } from '@/lib/ui';

export default function ElectionSelector({
  elections,
  selected,
  onSelect,
}: {
  elections: ElectionView[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const election = elections.find((item) => item.id === selected) ?? elections[0];

  return (
    <section className="election-picker" aria-label="Current election">
      <label htmlFor="election-select">Election</label>
      <div className="election-picker-control">
        <select id="election-select" value={election.id} onChange={(event) => onSelect(event.target.value)}>
          {elections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <ChevronDown size={18} aria-hidden="true" />
      </div>
      <div className="election-picker-meta">
        <span className={`state-badge state-${election.status.toLowerCase()}`}>
          <span className="mini-dot" />
          {election.status}
        </span>
        <span>{electionLabels[election.type] ?? election.type}</span>
        <span>{election.candidates.length} candidates</span>
        <span>Closes {dateLabel(election.closesAt)}</span>
      </div>
    </section>
  );
}

const electionArtwork: Record<string, string> = {
  COUNCIL: '/illustrations/city-council.webp',
  BUDGET: '/illustrations/community-budget.webp',
  COMMUNITY: '/illustrations/neighborhood-assembly.webp',
};

const filters = ['All', 'Active', 'Upcoming', 'Finished'] as const;
type ElectionFilter = (typeof filters)[number];

export function ElectionGallery({
  elections,
  onSelect,
}: {
  elections: ElectionView[];
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<ElectionFilter>('All');
  const visible = elections.filter(
    (election) => filter === 'All' || election.status === filter.toUpperCase(),
  );

  return (
    <section className="election-gallery" aria-label="Browse elections">
      <div className="election-gallery-filters" aria-label="Filter elections">
        {filters.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="election-gallery-list">
        {visible.map((election) => (
          <button
            className="election-gallery-card"
            type="button"
            key={election.id}
            onClick={() => onSelect(election.id)}
          >
            <Image
              src={electionArtwork[election.type] ?? electionArtwork.COMMUNITY}
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 360px"
            />
            <span className="election-gallery-shade" />
            <span className="election-gallery-content">
              <span className={`state-badge state-${election.status.toLowerCase()}`}>
                {election.status}
              </span>
              <strong>{election.title}</strong>
              <span className="election-gallery-type">
                {electionLabels[election.type] ?? election.type} · {election.candidates.length} candidates
              </span>
              <span className="election-gallery-action">
                View candidates <ArrowRight size={15} aria-hidden="true" />
              </span>
            </span>
          </button>
        ))}
      </div>
      {!visible.length && (
        <p className="election-gallery-empty">No {filter.toLowerCase()} elections to show.</p>
      )}
    </section>
  );
}
