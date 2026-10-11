import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ElectionView } from '@/lib/contracts';
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
      <ElectionSnapshot election={election} source={source} stale={stale} />
      <Link className="results-transparency-link" href={`/elections/${encodeURIComponent(election.id)}/transparency`}>
        View public transparency
        <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </div>
  );
}
