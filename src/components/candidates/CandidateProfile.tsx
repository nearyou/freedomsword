'use client';
import { useState } from 'react';
import { ArrowRight, CheckCircle2, FileText } from 'lucide-react';
import type { CandidateView, CitizenView, ElectionView } from '@/lib/contracts';
import { count, dateLabel, support, voteExplanation, type BallotView } from '@/lib/ui';
import type { Action } from '@/hooks/useVoting';
import Dialog from '../ui/Dialog';
import Avatar from '../ui/Avatar';
import IdeologyBadge from '../ui/IdeologyBadge';
import ProgressBar from '../ui/ProgressBar';
import PromiseTracker from '../PromiseTracker';
export default function CandidateProfile({
  candidate,
  election,
  citizen,
  ballot,
  ready,
  busy,
  onClose,
  onCast,
  onPassport,
  onAction,
}: {
  candidate: CandidateView;
  election: ElectionView;
  citizen: CitizenView;
  ballot?: BallotView;
  ready: boolean;
  busy: boolean;
  onClose: () => void;
  onCast: (candidate: CandidateView) => void;
  onPassport: () => void;
  onAction: (action: Action) => Promise<boolean>;
}) {
  const [tab, setTab] = useState('Overview');
  const [consent, setConsent] = useState(false);
  const platform = candidate.platform;
  const reason = voteExplanation(election, ballot, busy);
  return (
    <Dialog titleId="profile-title" onClose={onClose} busy={busy} className="profile-modal">
      <div className="profile-header">
        <Avatar name={candidate.fullName} color={candidate.color} large />
        <div>
          <p className="eyebrow">CANDIDATE PROFILE</p>
          <h2 id="profile-title">{candidate.fullName}</h2>
          <p className="party">{candidate.party}</p>
          <IdeologyBadge label={candidate.ideology} color={candidate.color} />
        </div>
      </div>
      <div className="profile-stats">
        <div>
          <strong>{support(candidate, election).toFixed(1)}%</strong>
          <span>Current support</span>
        </div>
        <div>
          <strong>{count(candidate.units)}</strong>
          <span>Vote units</span>
        </div>
        <div>
          <strong>{platform ? count(platform.signatures) : '—'}</strong>
          <span>Endorsements</span>
        </div>
      </div>
      <div className="tabs profile-tabs" role="tablist" aria-label="Candidate profile sections">
        {['Overview', 'Platform', 'Promises', 'Updates'].map((value) => (
          <button
            key={value}
            role="tab"
            id={`profile-tab-${value}`}
            aria-controls="profile-tab-panel"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div
        id="profile-tab-panel"
        role="tabpanel"
        aria-labelledby={`profile-tab-${tab}`}
        className="profile-content"
      >
        {tab === 'Overview' && (
          <>
            <h3>About {candidate.fullName.split(' ')[0]}</h3>
            <p className="modal-copy">{candidate.bio}</p>
            <ProgressBar
              value={support(candidate, election)}
              color={candidate.color}
              label="Current support"
            />
            {platform && (
              <button className="platform-preview" onClick={() => setTab('Platform')}>
                <FileText size={21} />
                <span>
                  <small>LATEST PLATFORM · V{platform.version}</small>
                  <strong>{platform.title}</strong>
                </span>
                <ArrowRight size={18} />
              </button>
            )}
          </>
        )}
        {tab === 'Platform' &&
          (platform ? (
            <>
              <div className="platform-detail">
                <div className="platform-meta">
                  <span className="state-badge">Platform v{platform.version}</span>
                  {platform.createdAt && (
                    <time dateTime={platform.createdAt}>{dateLabel(platform.createdAt)} · UTC</time>
                  )}
                </div>
                <h3>{platform.title}</h3>
                <div className="platform-prose">
                  {platform.content.split(/\n\s*\n/).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
                {platform.contentHash ? (
                  <details className="hash-detail">
                    <summary>SHA-256 content hash</summary>
                    <code>{platform.contentHash}</code>
                    <p>
                      Content integrity hash. A candidate cryptographic signature is not available.
                    </p>
                  </details>
                ) : (
                  <p className="fine-print">Preview content; a persisted hash is not available.</p>
                )}
              </div>
              <div className="endorsement-box">
                <strong>{count(platform.signatures)} endorsements</strong>
                <p>Authenticated consent to this exact platform version.</p>
                {citizen.signedPlatforms.includes(platform.id) ? (
                  <div className="signed-badge">
                    <CheckCircle2 size={17} />
                    Your endorsement is recorded
                  </div>
                ) : ready ? (
                  <>
                    <label className="consent">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(event) => setConsent(event.target.checked)}
                      />
                      I have read and endorse this platform version.
                    </label>
                    <button
                      className="button secondary full"
                      disabled={busy || !consent}
                      onClick={() =>
                        void onAction({
                          path: 'platform/sign',
                          payload: {
                            platformId: platform.id,
                            version: platform.version,
                            textHash: platform.contentHash,
                            accepted: true,
                          },
                          success: 'Platform endorsement recorded.',
                        })
                      }
                    >
                      Record endorsement
                    </button>
                  </>
                ) : (
                  <button className="button secondary full" onClick={onPassport}>
                    Complete Citizen Passport to endorse
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>No platform published</h3>
              <p>Platform details will appear here when available.</p>
            </div>
          ))}
        {tab === 'Promises' &&
          (platform ? (
            <PromiseTracker promises={platform.promises} />
          ) : (
            <div className="empty-state">
              <p>No promises published yet.</p>
            </div>
          ))}
        {tab === 'Updates' && (
          <div className="empty-state">
            <FileText size={28} />
            <h3>No update history available</h3>
            <p>
              Published milestones are available in Promises. Dated progress history is not
              currently provided.
            </p>
          </div>
        )}
      </div>
      <div className="profile-cta">
        <button
          className="button primary full"
          disabled={!!reason}
          onClick={() => onCast(candidate)}
        >
          Cast 100-unit vote <ArrowRight size={17} />
        </button>
        {reason && <p className="disabled-reason">{reason}</p>}
      </div>
    </Dialog>
  );
}
