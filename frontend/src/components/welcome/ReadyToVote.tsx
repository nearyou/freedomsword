'use client';
import { ArrowRight, Bird } from 'lucide-react';
import { useLanguage } from '@frontend/hooks/useLanguage';
import ShareInvite from '../voting/ShareInvite';

export default function ReadyToVote({ eligible, onContinue }: { eligible: boolean; onContinue: () => void }) {
  const [language] = useLanguage();
  const uk = language === 'uk';
  return <main className="ready-to-vote" aria-labelledby="ready-vote-title">
    <div className="ready-dove" aria-hidden="true"><Bird size={100} strokeWidth={1} /><span>✦</span></div>
    <h1 id="ready-vote-title">{uk ? 'Я готовий голосувати!' : 'I’m ready to vote!'}</h1>
    <p>{eligible ? uk ? 'Демонстраційну перевірку та громадянську угоду завершено.' : 'Your demo verification and civic agreement are complete.'
      : uk ? 'Долучайтеся та запрошуйте друзів. Перед голосуванням завершіть перевірку й прийміть угоду.' : 'Join in and invite your friends. Complete verification and the civic agreement before voting.'}</p>
    <ShareInvite ready />
    <button type="button" className="button primary ready-vote-next" onClick={onContinue}>{uk ? 'Я готовий голосувати' : 'I’m ready to vote'}<ArrowRight size={18} /></button>
  </main>;
}
