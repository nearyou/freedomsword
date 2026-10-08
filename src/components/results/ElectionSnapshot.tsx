import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { ElectionView } from '@/lib/contracts';
import { count, support } from '@/lib/ui';
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
  return (
    <section className="panel live-panel">
      <div className="panel-heading">
        <h3>
          <BarChart3 size={18} />
          Election snapshot
        </h3>
        <span className={`live-tag ${stale ? 'stale-tag' : ''}`}>
          {source === 'preview' ? 'SAMPLE' : stale ? 'STALE' : 'LIVE'}
        </span>
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
              outerRadius={94}
              paddingAngle={3}
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
          <span>active vote units</span>
        </div>
      </div>
      <div className="chart-legend">
        {ranked.map((candidate) => (
          <div key={candidate.id}>
            <span className="legend-name">
              <i style={{ background: candidate.color }} />
              {candidate.fullName}
            </span>
            <strong>{support(candidate, election).toFixed(1)}%</strong>
          </div>
        ))}
      </div>
      <div className="snapshot-stats">
        <div>
          <strong>{count(election.ballotCount)}</strong>
          <span>ballots cast</span>
        </div>
        <div>
          <strong>{count(election.recalledUnits)}</strong>
          <span>units recalled</span>
        </div>
      </div>
    </section>
  );
}
