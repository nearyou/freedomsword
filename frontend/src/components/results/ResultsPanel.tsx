import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ElectionView } from '@frontend/lib/contracts';
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
  return (
    <div className="results-dashboard">
      {election.protocol === 'MACI_PRIVATE' ? (
        election.privatePoll?.resultsPublishedAt ? <div className="panel private-results">
          <div className="panel-heading"><h2>Verified private results</h2></div>
          <p>MACI verified these aggregate totals on-chain. Individual ballots remain encrypted. A trusted coordinator processed the tally.</p>
          <strong>{election.activeUnits.toLocaleString()} active units</strong>
          <div className="private-results-list">
            {[...election.candidates].sort((a, b) => b.units - a.units).map((candidate) => {
              const percent = election.activeUnits ? candidate.units / election.activeUnits * 100 : 0;
              return <div className="private-result-row" key={candidate.id}>
                <div><strong>{candidate.fullName}</strong><span>{candidate.units.toLocaleString()} units · {percent.toFixed(1)}%</span></div>
                <div className="progress-track" role="progressbar" aria-label={`${candidate.fullName} verified support`}
                  aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                  <span style={{ width: `${percent}%`, background: candidate.color }} />
                </div>
              </div>;
            })}
          </div>
          <p className="fine-print">Tally commitment: <code>{election.privatePoll.tallyCommitment}</code></p>
        </div> : <div className="panel empty-state">
          <h2>Private results pending</h2>
          <p>Candidate totals will appear after the poll closes, MACI proofs are verified on-chain, and the minimum participation threshold is met.</p>
        </div>
      ) : (
        <>
      <ElectionSnapshot election={election} source={source} stale={stale} />
      <Link className="results-transparency-link" href={`/elections/${encodeURIComponent(election.id)}/transparency`}>
        View public transparency
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
        </>
      )}
    </div>
  );
}
