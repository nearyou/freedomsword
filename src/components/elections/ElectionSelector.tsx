import { Check, Users, Vote, WalletCards } from 'lucide-react';
import type { ElectionView } from '@/lib/contracts';
import { electionLabels, dateLabel } from '@/lib/ui';
export default function ElectionSelector({
  elections,
  selected,
  onSelect,
}: {
  elections: ElectionView[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="election-switcher" aria-label="Choose an election">
      {elections.map((election) => {
        const Icon =
          election.type === 'COUNCIL' ? Vote : election.type === 'BUDGET' ? WalletCards : Users;
        return (
          <button
            type="button"
            key={election.id}
            className={`election-option ${selected === election.id ? 'selected' : ''}`}
            aria-pressed={selected === election.id}
            onClick={() => onSelect(election.id)}
          >
            <span className="election-symbol">
              <Icon size={20} />
            </span>
            <span className="election-label">
              <strong>{election.title}</strong>
              <small>
                <span className="election-type">
                  {electionLabels[election.type] ?? election.type} ·{' '}
                </span>
                {election.candidates.length} candidates
              </small>
            </span>
            {selected === election.id && <Check size={17} className="selected-check" />}
          </button>
        );
      })}
    </section>
  );
}
export function ElectionDetail({ election }: { election: ElectionView }) {
  return (
    <div className="election-detail">
      <div>
        <span className={`state-badge state-${election.status.toLowerCase()}`}>
          <span className="mini-dot" />
          {election.status}
        </span>
        <strong>{election.title}</strong>
        <span className="muted">
          {electionLabels[election.type] ?? election.type} · {election.candidates.length} candidates
        </span>
      </div>
      <p>
        <span>Starts {dateLabel(election.opensAt)}</span>
        <span>Ends {dateLabel(election.closesAt)} · UTC</span>
      </p>
    </div>
  );
}
