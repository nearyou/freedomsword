import { ChevronRight } from 'lucide-react';
import type { CandidateView } from '@/lib/contracts';
import Avatar from '../ui/Avatar';
import PromiseTracker from '../PromiseTracker';
export default function AccountabilityPanel({
  candidates,
  onProfile,
}: {
  candidates: CandidateView[];
  onProfile: (candidate: CandidateView) => void;
}) {
  return (
    <div className="accountability-cards">
      {candidates.map((candidate) => (
        <article className="panel" key={candidate.id}>
          <button className="accountability-row" onClick={() => onProfile(candidate)}>
            <Avatar name={candidate.fullName} color={candidate.color} />
            <span>
              <strong>{candidate.fullName}</strong>
              <small>{candidate.platform?.title ?? 'Platform not yet published'}</small>
            </span>
            <ChevronRight size={19} />
          </button>
          {candidate.platform ? (
            <PromiseTracker promises={candidate.platform.promises} />
          ) : (
            <p className="fine-print">No promises have been published.</p>
          )}
        </article>
      ))}
      {!candidates.length && (
        <div className="panel empty-state">
          <h3>No accountability records yet</h3>
          <p>Published candidate promises will appear here.</p>
        </div>
      )}
    </div>
  );
}
