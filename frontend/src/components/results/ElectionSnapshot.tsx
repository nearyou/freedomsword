import type { ElectionView } from '@frontend/lib/contracts';
import { count, support } from '@frontend/lib/ui';
export default function ElectionSnapshot({
  election,
  source,
  stale = false,
}: {
  election: ElectionView;
  source: string;
  stale?: boolean;
}) {
  const ranked = [...election.candidates].sort((a, b) => b.units - a.units);
  const sample = source === 'preview';
  return (
    <section className="panel live-panel" aria-labelledby="live-results-title">
      <div className="live-panel-heading">
        <div>
          <h2 id="live-results-title">Support by candidate</h2>
          <p>
            {election.title} · {sample ? 'sample figures' : 'live aggregate units'}
          </p>
        </div>
        <span className={`live-tag ${stale ? 'stale-tag' : ''}`}>
          {sample ? 'SAMPLE' : stale ? 'STALE' : 'LIVE'}
        </span>
      </div>
      <div className="snapshot-stats">
        <div>
          <strong>{count(election.activeUnits)}</strong>
          <span>active units</span>
        </div>
        <div>
          <strong>{count(election.ballotCount)}</strong>
          <span>{election.protocol === 'CONTINUOUS_SUPPORT' ? 'participants' : 'ballots cast'}</span>
        </div>
        <div>
          <strong>{count(election.recalledUnits)}</strong>
          <span>{election.protocol === 'CONTINUOUS_SUPPORT' ? 'cooling units' : 'recalled units'}</span>
        </div>
      </div>
      <ol className="result-ranking">
        {ranked.map((candidate) => {
          const percent = support(candidate, election);
          return (
            <li key={candidate.id}>
              <span className="legend-name">
                <i style={{ background: candidate.color }} />
                <span>
                  {candidate.fullName}
                  <small>{count(candidate.units)} units</small>
                </span>
              </span>
              <span className="result-ranking-bar" aria-hidden="true">
                <span style={{ width: `${percent}%`, background: candidate.color }} />
              </span>
              <strong>{percent.toFixed(1)}%</strong>
            </li>
          );
        })}
      </ol>
      {sample && <p className="fine-print">Illustrative values until live results load.</p>}
    </section>
  );
}
