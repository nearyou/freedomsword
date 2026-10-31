'use client';
import type { ElectionView } from '@frontend/lib/contracts';
import { useLanguage } from '@frontend/hooks/useLanguage';
import { count } from '@frontend/lib/ui';

export default function LiveResults({ election, source, stale }: { election: ElectionView; source: string; stale: boolean }) {
  const [language] = useLanguage();
  const uk = language === 'uk';
  const sample = source === 'preview';
  const ranked = [...election.candidates].sort((a, b) => b.units - a.units);
  const visibleUnits = ranked.reduce((sum, item) => sum + item.units, 0);
  const otherUnits = Math.max(0, election.activeUnits - visibleUnits);
  const rows = [
    ...ranked.map((item) => ({ id: item.id, name: item.fullName, units: item.units, color: item.color })),
    ...(otherUnits ? [{ id: 'other-support', name: uk ? 'Інша підтримка' : 'Other support', units: otherUnits, color: '#788994' }] : []),
  ];
  let offset = 0;
  return <section className="panel live-results-card" aria-labelledby="live-results-title">
    <header className="live-results-heading"><div><h2 id="live-results-title">{election.title}</h2><p>{uk ? 'Результати наживо' : 'Live results'}</p></div>
      <span className={`live-tag ${stale ? 'stale-tag' : ''}`}>{sample ? uk ? 'ПРИКЛАД' : 'SAMPLE' : stale ? uk ? 'ЗАСТАРІЛІ' : 'STALE' : 'LIVE'}</span></header>
    <div className="live-results-chart">
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <circle cx="120" cy="120" r="94" stroke="#294352" strokeWidth="34" fill="none" />
        {rows.map((item) => {
          const percent = election.activeUnits ? item.units / election.activeUnits * 100 : 0;
          const start = offset; offset += percent;
          return <circle key={item.id} cx="120" cy="120" r="94" pathLength="100" fill="none" stroke={item.color}
            strokeWidth="34" strokeDasharray={`${percent} ${Math.max(0, 100 - percent)}`} strokeDashoffset={-start}
            transform="rotate(-90 120 120)" data-result-units={item.units} />;
        })}
      </svg>
      <div className="live-results-center"><strong>{election.activeUnits ? '100%' : '0%'}</strong><b>{count(election.activeUnits)}</b><span>{uk ? 'активних одиниць' : 'active units'}</span></div>
    </div>
    <ul className="live-results-legend" aria-label={uk ? 'Підтримка кандидатів' : 'Candidate support'}>
      {rows.map((item) => <li key={item.id}><span className="live-result-name"><i style={{ background: item.color }} />{item.name}</span>
        <strong>{(election.activeUnits ? item.units / election.activeUnits * 100 : 0).toFixed(1)}%</strong><span>{count(item.units)}</span></li>)}
    </ul>
    <dl className="live-results-stats">
      <div><dd>{count(election.ballotCount)}</dd><dt>{election.protocol === 'CONTINUOUS_SUPPORT' ? uk ? 'Учасників' : 'Participants' : uk ? 'Бюлетенів подано' : 'Ballots cast'}</dt></div>
      <div><dd>{count(election.activeUnits)}</dd><dt>{uk ? 'Активних одиниць' : 'Active units'}</dt></div>
      <div><dd>{count(election.recalledUnits)}</dd><dt>{election.protocol === 'CONTINUOUS_SUPPORT' ? uk ? 'Одиниць на очікуванні' : 'Cooling units' : uk ? 'Відкликаних одиниць' : 'Recalled units'}</dt></div>
      <div><dd aria-label={uk ? 'Дані про явку недоступні' : 'Participation unavailable'}>—</dd><dt>{uk ? 'Явка' : 'Participation'}</dt></div>
    </dl>
    <p className="fine-print">{uk ? 'Відсоток явки недоступний: немає загальної кількості виборців.' : 'Participation percentage is unavailable: the eligible-voter total is not provided.'}</p>
    {sample && <p className="fine-print">{uk ? 'Ілюстративні значення до завантаження актуальних результатів.' : 'Illustrative values until live results load.'}</p>}
    {stale && <p className="fine-print" role="status">{uk ? 'Останнє оновлення не вдалося. Показано попередні результати.' : 'The latest refresh failed. Previously loaded results are shown.'}</p>}
  </section>;
}
