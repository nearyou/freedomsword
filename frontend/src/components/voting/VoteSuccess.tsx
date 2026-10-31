'use client';
import { useEffect, useRef } from 'react';
import { useLanguage } from '@frontend/hooks/useLanguage';
import BallotIllustration from './BallotIllustration';

export default function VoteSuccess({ name, units, reusable = true, onBallot, onExplore }: {
  name: string; units: number; reusable?: boolean; onBallot: () => void; onExplore: () => void;
}) {
  const [language] = useLanguage();
  const uk = language === 'uk';
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <section className="vote-success panel" aria-labelledby="vote-success-title">
    <BallotIllustration celebrate />
    <h2 id="vote-success-title" ref={heading} tabIndex={-1}>{uk ? 'Ваш голос зараховано!' : 'Your vote is cast!'}</h2>
    <p className="vote-success-allocation">{uk ? `${units} одиниць підтримки для` : `${units} units allocated to`}<strong>{name}</strong></p>
    <p>{uk ? 'Ви можете відкликати підтримку відповідно до правил цих виборів.' : 'You can recall your support according to this election’s rules.'}</p>
    {reusable && <p className="fine-print">{uk ? 'Кожна відкликана частина стане доступною через шість календарних місяців.' : 'Each recalled portion becomes available again six calendar months after withdrawal.'}</p>}
    <div className="vote-flow-actions"><button className="button primary" onClick={onBallot}>{uk ? 'Мій бюлетень' : 'View my ballot'}</button>
      <button className="button secondary" onClick={onExplore}>{uk ? 'До виборів' : 'Back to elections'}</button></div>
    <small className="fine-print">{uk ? 'Вигадане демо · голоси доступні оператору.' : 'Fictional demo · votes are visible to the operator.'}</small>
  </section>;
}
