import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { ElectionView } from '@/shared/contracts';
import type { BallotView } from '@/frontend/lib/ui';
import { supportSegments } from '@/frontend/lib/ballot-ui';
import Avatar from '../ui/Avatar';
import RecallPanel from './RecallPanel';
import ShareInvite from './ShareInvite';
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
      {ballot ? (
        <>
          <div className="panel-heading">
            <h3>Your choice</h3>
            <ShieldCheck size={19} />
          </div>
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
          <RecallPanel
            election={election}
            ballot={ballot}
            now={now}
            ready={ready}
            busy={busy}
            privateError={privateError}
            onRecall={onRecall}
          />
          <ShareInvite />
        </>
      ) : (
        <div className="empty-ballot">
          <h3>No choice recorded yet</h3>
          <p>Explore the candidates, then choose one to support.</p>
          <button className="button primary" onClick={onExplore}>
            Explore candidates
            <ArrowRight size={17} />
          </button>
          {!ready && (
            <button className="text-button" onClick={onPassport}>Complete Citizen Passport to vote</button>
          )}
        </div>
      )}
    </div>
  );
}
