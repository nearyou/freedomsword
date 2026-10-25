import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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
  const chart = election.activeUnits
    ? ranked.map((candidate) => ({
        name: candidate.fullName,
        value: candidate.units,
        color: candidate.color,
      }))
    : [{ name: 'No active support', value: 1, color: 'var(--border)' }];
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
      <div
        className="donut"
        role="img"
        aria-label={`${count(election.activeUnits)} active units. ${ranked.map((candidate) => `${candidate.fullName}: ${support(candidate, election).toFixed(1)}%`).join(', ')}`}
      >
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chart}
              dataKey="value"
              innerRadius={76}
              outerRadius={98}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {chart.map((item, index) => (
                <Cell key={index} fill={item.color} />
              ))}
            </Pie>
            {!!election.activeUnits && (
              <Tooltip
                formatter={(value) => [`${count(Number(value))} units`, 'Support']}
                contentStyle={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  color: 'var(--text)',
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-label">
          <strong>{count(election.activeUnits)}</strong>
          <span>active units</span>
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
