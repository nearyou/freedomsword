import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { CandidateView, ElectionView } from '@/lib/contracts';
import { count, support, voteExplanation, type BallotView } from '@/lib/ui';
import Avatar from '../ui/Avatar';
import IdeologyBadge from '../ui/IdeologyBadge';
import ProgressBar from '../ui/ProgressBar';
export default function CandidateCard({
  candidate,
  election,
  ballot,
  busy,
  onProfile,
  onCast,
}: {
  candidate: CandidateView;
  election: ElectionView;
  ballot?: BallotView;
  busy: boolean;
  onProfile: (candidate: CandidateView) => void;
  onCast: (candidate: CandidateView) => void;
}) {
  const reason = voteExplanation(election, ballot, busy);
  return (
    <article className="candidate-card">
      <div className="candidate-head">
        <Avatar name={candidate.fullName} color={candidate.color} />
        <IdeologyBadge label={candidate.ideology} color={candidate.color} />
      </div>
      <h3>{candidate.fullName}</h3>
      <div className="party">
        <span style={{ background: candidate.color }} />
        {candidate.party}
      </div>
      <p className="candidate-bio">{candidate.bio}</p>
      <div className="candidate-support">
        <span>Current support</span>
        <strong>
          {support(candidate, election).toFixed(1)}
          <small>%</small>
        </strong>
      </div>
      <ProgressBar
        value={support(candidate, election)}
        color={candidate.color}
        label={`${candidate.fullName} support`}
      />
      <div className="units-label">{count(candidate.units)} vote units</div>
      <div className="candidate-actions">
        <button className="button secondary" onClick={() => onProfile(candidate)}>
          View profile <ArrowUpRight size={15} />
        </button>
        <button
          className="button primary"
          disabled={!!reason}
          title={reason || undefined}
          aria-describedby={reason ? `cast-reason-${candidate.id}` : undefined}
          onClick={() => onCast(candidate)}
        >
          {ballot?.candidateId === candidate.id
            ? 'Your ballot'
            : ballot
              ? 'Already voted'
              : 'Cast vote'}
          <ArrowRight size={15} />
        </button>
      </div>
      {reason && (
        <p className="disabled-reason" id={`cast-reason-${candidate.id}`}>
          {reason}
        </p>
      )}
    </article>
  );
}
