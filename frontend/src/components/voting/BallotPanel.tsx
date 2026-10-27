import { ArrowRight, Check, Undo2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { CitizenView, ElectionView } from '@frontend/lib/contracts';
import type { BallotView } from '@frontend/lib/ui';
import { supportSegments } from '@frontend/lib/ballot-ui';
import RecallPanel from './RecallPanel';
import ShareInvite from './ShareInvite';
const PrivateBallotPanel = dynamic(() => import('./PrivateBallotPanel'), { ssr: false });
const ReusableSupportPanel = dynamic(() => import('./ReusableSupportPanel'), { ssr: false });
export default function BallotPanel({
  election,
  ballot,
  citizen,
  onRefresh,
  ready,
  busy,
  privateError,
  now,
  onRecall,
  onExplore,
  onPassport,
  initialCandidateId,
}: {
  election: ElectionView;
  ballot?: BallotView;
  citizen: CitizenView;
  onRefresh: () => Promise<void>;
  ready: boolean;
  busy: boolean;
  privateError: boolean;
  now: number;
  onRecall: (mode: 'partial' | 'full', units?: number) => void;
  onExplore: () => void;
  onPassport: () => void;
  initialCandidateId?: string;
}) {
  if (election.protocol === 'CONTINUOUS_SUPPORT')
    return <ReusableSupportPanel key={election.id} election={election} connected={citizen.connected}
      ready={ready && !privateError} now={now} onPassport={onPassport} onRefresh={onRefresh} initialCandidateId={initialCandidateId} />;
  if (election.protocol === 'MACI_PRIVATE') {
    return <PrivateBallotPanel key={election.id} election={election} citizen={citizen} ready={ready}
      now={now} onPassport={onPassport} onRefresh={onRefresh} />;
  }
  const candidate = election.candidates.find((candidate) => candidate.id === ballot?.candidateId);
  const segments = supportSegments(
    ballot?.balance ?? 100,
    election.recallPolicy?.partialEnabled === false
      ? 100
      : (election.recallPolicy?.partialAmount ?? 25),
  );
  if (ballot) {
    const recalled = ballot.balance === 0;
    const state = recalled ? 'RECALLED' : election.status === 'ACTIVE' ? 'ACTIVE' : 'FINAL';
    return (
      <div className="ballot-after">
        <header className={`ballot-hero ${recalled ? 'recalled' : ''}`}>
          <span className="ballot-hero-icon" aria-hidden="true">
            {recalled ? <Undo2 size={30} /> : <Check size={34} strokeWidth={2.6} />}
          </span>
          <h2>{recalled ? 'Your support is recalled' : 'Your vote is cast'}</h2>
          <p>
            {recalled ? 'Your demo ballot no longer supports ' : 'Your demo ballot supports '}
            <strong>{candidate?.fullName ?? 'your selected candidate'}</strong>
            {candidate?.party ? ` · ${candidate.party}` : ''}.
          </p>
        </header>
        <section className="panel ballot-panel" aria-labelledby="ballot-card-title">
          <div className="ballot-card-top">
            <div className="balance">
              <span className="ballot-kicker" id="ballot-card-title">Your ballot</span>
              <strong>
                {ballot.balance}
                <small> / 100</small>
              </strong>
              <span>units remaining</span>
            </div>
            <span className={`ballot-state ballot-state-${state.toLowerCase()}`}>{state}</span>
          </div>
          <div
            className="support-meter"
            style={{ gap: `${Math.min(4, 100 / segments.length)}px` }}
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
        </section>
        {!recalled && <ShareInvite />}
      </div>
    );
  }
  return (
    <div className="panel ballot-panel">
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
    </div>
  );
}
