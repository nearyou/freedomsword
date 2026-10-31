'use client';
import { Clock3, RotateCcw, Vote } from 'lucide-react';
import type { CandidateView } from '@frontend/lib/contracts';
import { useLanguage } from '@frontend/hooks/useLanguage';
import Avatar from '../ui/Avatar';

export default function AllocationConfirmation({ candidate, units }: { candidate?: CandidateView; units: number }) {
  const [language] = useLanguage();
  const uk = language === 'uk';
  return <>
    <p className="eyebrow">{uk ? 'Ваш голос має значення' : 'Your voice matters'}</p>
    {candidate && <div className="confirmation-candidate"><Avatar name={candidate.fullName} color={candidate.color} />
      <div><strong>{candidate.fullName}</strong><span>{candidate.party}</span><small>{candidate.ideology}</small></div></div>}
    <ul className="allocation-rules">
      <li><Vote size={20} /><span>{uk ? `${units} одиниць підтримають цього кандидата.` : `${units} units will support this candidate.`}</span></li>
      <li><RotateCcw size={20} /><span>{uk ? 'Підтримку можна відкликати частково або повністю.' : 'You can recall part or all of your support.'}</span></li>
      <li><Clock3 size={20} /><span>{uk ? 'Відкликані одиниці можна використати знову через шість календарних місяців після кожного відкликання.' : 'Recalled units can be used again six calendar months after each withdrawal.'}</span></li>
    </ul>
  </>;
}
