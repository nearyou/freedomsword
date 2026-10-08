import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ElectionView } from '@/lib/contracts';
import { count, support } from '@/lib/ui';
import Avatar from '../ui/Avatar';
import ProgressBar from '../ui/ProgressBar';
import ElectionSnapshot from './ElectionSnapshot';
export default function ResultsPanel({
  election,
  source,
  stale,
}: {
  election: ElectionView;
  source: string;
  stale: boolean;
}) {
  const ranked = [...election.candidates].sort((a, b) => b.units - a.units);
  return (
    <div className="results-dashboard">
      <div className="results-stats">
        <div className="panel">
          <span>Active support</span>
          <strong>{count(election.activeUnits)}</strong>
          <small>remaining units</small>
        </div>
        <div className="panel">
          <span>Original units</span>
          <strong>{count(election.ballotCount * 100)}</strong>
          <small>100 per initial ballot</small>
        </div>
        <div className="panel">
          <span>Recalled units</span>
          <strong>{count(election.recalledUnits)}</strong>
          <small>permanently withdrawn</small>
        </div>
        <div className="panel">
          <span>Participation</span>
          <strong>{count(election.ballotCount)}</strong>
          <small>ballots cast</small>
        </div>
      </div>
      <ElectionSnapshot election={election} source={source} stale={stale} />
      <section className="panel results-panel">
        <div className="panel-heading">
          <h3>Support ranking</h3>
          <Link
            className="text-button"
            href={`/elections/${encodeURIComponent(election.id)}/transparency`}
          >
            Transparency <ArrowUpRight size={15} />
          </Link>
        </div>
        {ranked.map((candidate, index) => (
          <div className="result-row" key={candidate.id}>
            <span className="rank">{String(index + 1).padStart(2, '0')}</span>
            <Avatar name={candidate.fullName} color={candidate.color} />
            <div className="result-name">
              <strong>{candidate.fullName}</strong>
              <small>{candidate.party}</small>
              <ProgressBar
                value={support(candidate, election)}
                color={candidate.color}
                label={`${candidate.fullName} support`}
              />
            </div>
            <div className="result-value">
              <strong>{support(candidate, election).toFixed(1)}%</strong>
              <small>{count(candidate.units)} units</small>
            </div>
          </div>
        ))}
        {!election.ballotCount && (
          <p className="empty-state compact">
            No ballots yet. Results appear after participation begins.
          </p>
        )}
        <p className="fine-print">
          Participation counts recorded ballots, including fully recalled ballots. An eligible-voter
          denominator is unavailable, so no turnout percentage is shown.
        </p>
      </section>
    </div>
  );
}
