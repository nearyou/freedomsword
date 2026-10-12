import { ChevronRight } from 'lucide-react';
import type { CandidateView, ElectionView } from '@/lib/contracts';
import { support } from '@/lib/ui';
import Avatar from '../ui/Avatar';

export default function CandidateCard({
  candidate,
  election,
  onProfile,
}: {
  candidate: CandidateView;
  election: ElectionView;
  onProfile: (candidate: CandidateView) => void;
}) {
  const percentage = support(candidate, election);

  return (
    <article className="candidate-card candidate-card-clear">
      <div className="candidate-card-identity">
        <Avatar name={candidate.fullName} color={candidate.color} />
        <div>
          <h3>{candidate.fullName}</h3>
          <p>{candidate.party}</p>
        </div>
        <ChevronRight className="candidate-row-arrow" size={18} aria-hidden="true" />
      </div>
      <div className="candidate-card-support">
        <span>Support</span>
        <strong>{percentage.toFixed(1)}%</strong>
      </div>
      <div className="progress-track" role="progressbar" aria-label={`${candidate.fullName} support`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <span style={{ width: `${percentage}%`, background: candidate.color }} />
      </div>
      <button className="candidate-card-open" type="button" aria-label={`View ${candidate.fullName} profile`} onClick={() => onProfile(candidate)}>
        <span className="sr-only">View {candidate.fullName} profile</span>
      </button>
    </article>
  );
}
