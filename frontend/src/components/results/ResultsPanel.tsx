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
        <div className="panel empty-state">
          <h2>Private results pending</h2>
          <p>Candidate totals will appear after the poll closes and the MACI tally proof is verified.</p>
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
