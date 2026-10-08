import { ArrowRight, Fingerprint, ShieldCheck } from 'lucide-react';
import type { ElectionView } from '@/lib/contracts';
import type { BallotView } from '@/lib/ui';
import { supportSegments } from '@/lib/ballot-ui';
import Avatar from '../ui/Avatar';
import RecallPanel from './RecallPanel';
export default function BallotPanel({
  election,
  ballot,
  ready,
  busy,
  privateError,
  now,
  onRecall,
  onExplore,
  onPassport,
}: {
  election: ElectionView;
  ballot?: BallotView;
  ready: boolean;
  busy: boolean;
  privateError: boolean;
  now: number;
  onRecall: (mode: 'partial' | 'full') => void;
  onExplore: () => void;
  onPassport: () => void;
}) {
  const candidate = election.candidates.find((candidate) => candidate.id === ballot?.candidateId);
  const segments = supportSegments(
    ballot?.balance ?? 100,
    election.recallPolicy?.partialEnabled === false
      ? 100
      : (election.recallPolicy?.partialAmount ?? 25),
  );
  return (
    <div className="panel ballot-panel">
      <div className="panel-heading">
        <h3>My ballot</h3>
        <ShieldCheck size={19} />
      </div>
      {ballot ? (
        <>
          <div className="ballot-candidate">
            {candidate && <Avatar name={candidate.fullName} color={candidate.color} />}
            <div>
              <strong>{candidate?.fullName ?? 'Your selected candidate'}</strong>
              <span>{candidate?.party ?? 'Candidate details unavailable'}</span>
            </div>
          </div>
          <div className="balance">
            <strong>
              {ballot.balance}
              <small> / 100</small>
            </strong>
            <span>units remaining</span>
          </div>
          <div
            className="support-meter"
            style={{ gap: `${Math.min(3, 100 / segments.length)}px` }}
            role="meter"
            aria-label="Remaining ballot support"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={ballot.balance}
          >
            {segments.map((segment, index) => (
              <span key={index} style={{ flexGrow: segment.units }}>
                <i
                  style={{
                    width: `${segment.fill}%`,
                    background: candidate?.color ?? 'var(--primary)',
                  }}
                />
              </span>
            ))}
          </div>
          <div className="meter-label">
            <span>{100 - ballot.balance} units recalled</span>
            <span>100 original units</span>
          </div>
          <RecallPanel
            election={election}
            ballot={ballot}
            now={now}
            ready={ready}
            busy={busy}
            privateError={privateError}
            onRecall={onRecall}
          />
        </>
      ) : (
        <div className="empty-ballot">
          <div className="modal-symbol">
            <Fingerprint size={30} />
          </div>
          <h3>Your support starts here.</h3>
          <p>
            Choose one candidate and allocate a 100-unit ballot. You can recall support later under
            this election’s rules.
          </p>
          <div className="balance">
            <strong>100</strong>
            <span>units in your initial ballot</span>
          </div>
          <button className="button primary" onClick={ready ? onExplore : onPassport}>
            {ready ? 'Explore candidates' : 'Get ready to vote'}
            <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
