'use client';
import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, ShieldCheck, Wallet } from 'lucide-react';
import type { CitizenView } from '@frontend/lib/contracts';
import { api } from '@frontend/lib/client-api';
import type { Action } from '@frontend/hooks/useVoting';
import Dialog from '../ui/Dialog';
import AgreementStep from './AgreementStep';
export type AgreementDocument = { text: string; textHash: string; version: number };
export default function CitizenPassport({
  citizen,
  busy,
  ready,
  demoEnabled,
  launch,
  onClose,
  onConnect,
  onLogout,
  onAction,
}: {
  citizen: CitizenView;
  busy: boolean;
  ready: boolean;
  demoEnabled: boolean;
  launch: string;
  onClose: () => void;
  onConnect: (demo: boolean) => Promise<void>;
  onLogout: () => Promise<void>;
  onAction: (action: Action) => Promise<boolean>;
}) {
  const [agreement, setAgreement] = useState<AgreementDocument | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setAgreement(await api<AgreementDocument>('agreement'));
      setError('');
    } catch {
      setError('Agreement could not be loaded. Please retry.');
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  const states = [citizen.connected, citizen.verified, citizen.agreementSigned];
  return (
    <Dialog titleId="citizen-title" onClose={onClose} busy={busy} className="passport-modal">
      <div className="modal-symbol">
        <ShieldCheck size={27} />
      </div>
      <p className="eyebrow">CITIZEN PASSPORT</p>
      <h2 id="citizen-title">Get ready to vote</h2>
      <p className="modal-copy">Mock verification. Your account and ballot can be linked.</p>
      <div className="passport-progress">
        {states.filter(Boolean).length} of 3 steps complete
        <div className="passport-progress-bar">
          {states.map((done, index) => (
            <span key={index} className={done ? 'done' : ''} />
          ))}
        </div>
      </div>
      <div className={`onboard-step ${citizen.connected ? 'complete' : ''}`}>
        <span className="step-number">{citizen.connected ? <Check size={16} /> : 1}</span>
        <div>
          <h3>Connect Telegram</h3>
          {!citizen.connected && launch !== 'ready' && (
            <p className="launch-message" role={launch === 'failed' ? 'alert' : 'status'}>
              {launch === 'loading'
                ? 'Checking Telegram launch…'
                : launch === 'outside'
                  ? 'Open this Mini App from your Telegram bot to connect.'
                  : 'Telegram did not load. Reopen this Mini App from your bot.'}
            </p>
          )}
          {citizen.connected ? (
            <button className="text-button" disabled={busy} onClick={() => void onLogout()}>
              Sign out
            </button>
          ) : (
            <div className="stack-buttons">
              <button
                className="button primary full"
                disabled={busy || launch === 'loading'}
                onClick={() => void onConnect(false)}
              >
                Connect Telegram <ArrowRight size={16} />
              </button>
              {demoEnabled && (
                <button
                  className="button secondary full"
                  disabled={busy}
                  onClick={() => void onConnect(true)}
                >
                  Start local demo account
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="wallet-preview" aria-label="Wallet connection status">
        <Wallet size={20} aria-hidden="true" />
        <div>
          <strong>Connect wallet</strong>
          <p>Integration planned</p>
        </div>
        <span>PLANNED</span>
      </div>
      <div className={`onboard-step ${citizen.verified ? 'complete' : ''}`}>
        <span className="step-number">{citizen.verified ? <Check size={16} /> : 2}</span>
        <div>
          <h3>
            Verify eligibility <span className="mock-badge">MOCK</span>
          </h3>
          <p>Mock check · Rarimo planned</p>
          <button
            className="button secondary full"
            disabled={!citizen.connected || busy || citizen.verified}
            onClick={() =>
              void onAction({
                path: 'verify',
                payload: { consent: true },
                success: 'MOCK eligibility verified for 30 days.',
              })
            }
          >
            {citizen.verified ? 'Eligibility confirmed · MOCK' : 'I consent to mock verification'}
          </button>
          {!citizen.connected && <p className="disabled-reason">Connect Telegram first.</p>}
        </div>
      </div>
      <div className={`onboard-step ${citizen.agreementSigned ? 'complete' : ''}`}>
        <span className="step-number">{citizen.agreementSigned ? <Check size={16} /> : 3}</span>
        <div>
          <h3>Accept citizen agreement</h3>
          <AgreementStep
            agreement={agreement}
            accepted={accepted}
            onAccepted={setAccepted}
            signed={citizen.agreementSigned}
            verified={citizen.verified}
            busy={busy}
            error={error}
            onLoad={() => void load()}
            onAccept={() =>
              agreement &&
              void onAction({
                path: 'agreement',
                payload: { accepted: true, textHash: agreement.textHash },
                success: 'Citizen agreement acceptance recorded.',
              })
            }
          />
        </div>
      </div>
      <details className="passport-disclosure">
        <summary>About this demo</summary>
        <p>Mock eligibility does not prove legal identity. Agreement acceptance records consent, not a cryptographic signature.</p>
      </details>
      <p className="powered-by">
        Powered by{' '}
        <a href="https://freedomtool.org/" target="_blank" rel="noopener noreferrer">
          FreedomTool
        </a>
      </p>
      {ready && (
        <button className="button primary full" onClick={onClose}>
          Explore the election <ArrowRight size={16} />
        </button>
      )}
    </Dialog>
  );
}
