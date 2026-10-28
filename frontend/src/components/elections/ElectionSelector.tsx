import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, ChevronDown } from 'lucide-react';
import type { ElectionView } from '@frontend/lib/contracts';
import { dateLabel } from '@frontend/lib/ui';

const stateLabels: Record<string, string> = {
  ACTIVE: 'Open now', UPCOMING: 'Coming soon', FINISHED: 'Closed', ARCHIVED: 'Archived', DRAFT: 'Draft',
};

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
          {stateLabels[election.status] ?? election.status}
        </span>
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
  const showFilters = new Set(elections.map((election) => election.status)).size > 1;
  const activeFilter = showFilters ? filter : 'All';
  const visible = elections.filter(
    (election) => activeFilter === 'All' || election.status === activeFilter.toUpperCase(),
  ).sort((a, b) => Number(b.protocol === 'CONTINUOUS_SUPPORT') - Number(a.protocol === 'CONTINUOUS_SUPPORT'));

  return (
    <section className="election-gallery" aria-label="Browse elections">
      {showFilters && (
        <div className="election-gallery-filters" aria-label="Filter elections">
          {filters.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={activeFilter === value}
              onClick={() => setFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
      )}
      <div className="election-gallery-list">
        {visible.map((election, index) => (
          <button
            className="election-gallery-card"
            type="button"
            key={election.id}
            onClick={() => onSelect(election.id)}
          >
            <span className="election-gallery-art">
              <Image
                src={electionArtwork[election.type] ?? electionArtwork.COMMUNITY}
                alt=""
                fill
                sizes="(max-width: 760px) 100vw, 460px"
                loading={index < 2 ? 'eager' : 'lazy'}
              />
              <span className="election-gallery-shade" />
              <span className={`state-badge state-${election.status.toLowerCase()}`}>
                {stateLabels[election.status] ?? election.status}
              </span>
            </span>
            <span className="election-gallery-content">
              <span className="election-gallery-category">{election.type === 'COUNCIL' ? 'Local decisions'
                : election.type === 'BUDGET' ? 'Shared priorities' : 'Community life'}</span>
              <strong>{election.title}</strong>
              <span className="election-gallery-type">{election.protocol === 'CONTINUOUS_SUPPORT'
                ? 'Reusable support · six-month return' : election.protocol === 'MACI_PRIVATE'
                  ? 'Private voting' : 'Original demo ballot rules'}</span>
              <span className="election-gallery-footer">
                <span>{election.candidates.length} candidates</span>
                <span className="election-gallery-action">Meet candidates <ArrowRight size={15} aria-hidden="true" /></span>
              </span>
            </span>
          </button>
        ))}
      </div>
      {!visible.length && (
        <p className="election-gallery-empty">No {activeFilter.toLowerCase()} elections to show.</p>
      )}
    </section>
  );
}
