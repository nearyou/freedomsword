'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, FileSignature, ShieldCheck } from 'lucide-react';
import Dialog from '@/components/ui/Dialog';
import type { AgreementDocument } from '@/components/onboarding/CitizenPassport';
import { api } from '@/lib/client-api';
import { AGREEMENT_TEXT, AGREEMENT_VERSION } from '@/lib/agreement';
import { validateMockVerification } from '@/lib/welcome';
import type { Language, WelcomeCopy } from './copy';
import { GoldButton, Ornament } from './WelcomeParts';

type ModalProps = {
  t: WelcomeCopy;
  onClose: () => void;
  busy: boolean;
  error: string;
  preview: boolean;
};

function Success({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="civic-success" role="status">
      <span className="civic-seal">
        <Check size={32} />
      </span>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}

export function VerificationModal({
  t,
  onClose,
  busy,
  error,
  preview,
  verified,
  available,
  onVerify,
  onAgreement,
}: ModalProps & {
  verified: boolean;
  available: boolean;
  onVerify: () => Promise<boolean>;
  onAgreement: () => void;
}) {
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({ name: false, consent: false });
  const nameInput = useRef<HTMLInputElement>(null);
  const consentInput = useRef<HTMLInputElement>(null);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validateMockVerification(name, consent);
    setErrors(next);
    if (next.name || next.consent) {
      (next.name ? nameInput : consentInput).current?.focus();
      return;
    }
    await onVerify();
  }
  return (
    <Dialog titleId="welcome-verify-title" onClose={onClose} busy={busy} className="civic-modal">
      <span className="civic-seal modal-seal">
        <ShieldCheck size={32} strokeWidth={1.3} />
      </span>
      <p className="civic-eyebrow">
        {t.step} 1 · {t.mock}
      </p>
      <h2 id="welcome-verify-title">{t.verify}</h2>
      <p className="civic-modal-intro">{t.verifyIntro}</p>
      <Ornament small />
      {verified ? (
        <>
          <Success title={t.verified} detail={t.verifiedDetail} />
          <GoldButton type="button" onClick={onAgreement}>
            {t.nextAgreement}
          </GoldButton>
        </>
      ) : (
        <form noValidate onSubmit={(event) => void submit(event)}>
          <p className="civic-modal-copy">{t.verifyDetail}</p>
          {preview && (
            <p className="civic-mode-label">
              {t.preview} · {t.demonstration}
            </p>
          )}
          <label className="civic-field-label" htmlFor="preview-name">
            {t.name}
          </label>
          <input
            id="preview-name"
            ref={nameInput}
            className="civic-input"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrors((current) => ({ ...current, name: false }));
            }}
            maxLength={60}
            autoComplete="off"
            placeholder={t.namePlaceholder}
            aria-invalid={errors.name}
            aria-describedby="preview-name-help preview-name-error"
            disabled={busy}
          />
          <p id="preview-name-help" className="civic-field-help">
            {t.nameHelp}
          </p>
          <p
            id="preview-name-error"
            className="civic-field-error"
            role={errors.name ? 'alert' : undefined}
          >
            {errors.name ? t.nameError : ''}
          </p>
          <label className="civic-checkbox-label">
            <input
              type="checkbox"
              ref={consentInput}
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                setErrors((current) => ({ ...current, consent: false }));
              }}
              disabled={busy}
              aria-invalid={errors.consent}
              aria-describedby="mock-consent-error"
            />
            <span>{t.consent}</span>
          </label>
          <p
            id="mock-consent-error"
            className="civic-field-error"
            role={errors.consent ? 'alert' : undefined}
          >
            {errors.consent ? t.consentError : ''}
          </p>
          {!available && (
            <p className="civic-field-help" role="status">
              {t.connecting}
            </p>
          )}
          {error && (
            <p className="civic-field-error" role="alert">
              {error}
            </p>
          )}
          <GoldButton type="submit" disabled={busy || !available} busy={busy}>
            {busy ? t.verifying : t.verifyButton}
          </GoldButton>
        </form>
      )}
    </Dialog>
  );
}

export function AgreementModal({
  t,
  lang,
  onClose,
  busy,
  error,
  preview,
  verified,
  accepted,
  onAccept,
  onVerify,
  onContinue,
}: ModalProps & {
  lang: Language;
  verified: boolean;
  accepted: boolean;
  onAccept: (document: AgreementDocument) => Promise<boolean>;
  onVerify: () => void;
  onContinue: () => void;
}) {
  const [document, setDocument] = useState<AgreementDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [consent, setConsent] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const consentInput = useRef<HTMLInputElement>(null);
  const alive = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const next = preview
        ? { text: AGREEMENT_TEXT, version: AGREEMENT_VERSION, textHash: '' }
        : await api<AgreementDocument>('agreement');
      if (alive.current) setDocument(next);
    } catch {
      if (alive.current) setLoadError(true);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [preview]);
  useEffect(() => {
    alive.current = true;
    const timer = setTimeout(() => void load(), 0);
    return () => {
      alive.current = false;
      clearTimeout(timer);
    };
  }, [load]);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      setInvalid(true);
      consentInput.current?.focus();
      return;
    }
    if (verified && document) await onAccept(document);
  }
  return (
    <Dialog titleId="welcome-agreement-title" onClose={onClose} busy={busy} className="civic-modal">
      <span className="civic-seal modal-seal">
        <FileSignature size={31} strokeWidth={1.3} />
      </span>
      <p className="civic-eyebrow">
        {t.step} 2 · {preview ? t.preview : t.mock}
      </p>
      <h2 id="welcome-agreement-title">{t.agreement}</h2>
      <p className="civic-modal-intro">{t.agreementIntro}</p>
      <Ornament small />
      {accepted && verified ? (
        <>
          <Success title={t.accepted} detail={t.acceptedDetail} />
          <GoldButton type="button" onClick={onContinue}>
            {t.continueReady}
          </GoldButton>
        </>
      ) : (
        <form noValidate onSubmit={(event) => void submit(event)}>
          <p className="civic-modal-copy">{t.agreementDetail}</p>
          {loading && (
            <p className="civic-field-help" role="status">
              {t.loadingAgreement}
            </p>
          )}
          {loadError && (
            <div className="civic-load-error" role="alert">
              <p>{t.loadError}</p>
              <button type="button" className="civic-text-button" onClick={() => void load()}>
                {t.retry}
              </button>
            </div>
          )}
          {document && (
            <>
              <p className="civic-agreement-version">
                {t.version} {document.version}
              </p>
              {lang === 'uk' && <p className="civic-field-help">{t.agreementLanguage}</p>}
              <div className="civic-agreement-document" lang="en">
                {document.text}
              </div>
            </>
          )}
          {!verified ? (
            <div className="civic-prerequisite">
              <p>{t.prerequisite}</p>
              <GoldButton type="button" onClick={onVerify}>
                {t.verify}
              </GoldButton>
            </div>
          ) : (
            <>
              <label className="civic-checkbox-label">
                <input
                  type="checkbox"
                  ref={consentInput}
                  checked={consent}
                  onChange={(event) => {
                    setConsent(event.target.checked);
                    setInvalid(false);
                  }}
                  disabled={busy || !document || loading || loadError}
                  aria-invalid={invalid}
                  aria-describedby="agreement-consent-error"
                />
                <span>{t.agree}</span>
              </label>
              <p
                id="agreement-consent-error"
                className="civic-field-error"
                role={invalid ? 'alert' : undefined}
              >
                {invalid ? t.acceptError : ''}
              </p>
              {error && (
                <p className="civic-field-error" role="alert">
                  {error}
                </p>
              )}
              <GoldButton
                type="submit"
                disabled={busy || !document || loading || loadError}
                busy={busy}
              >
                {busy ? t.accepting : t.acceptButton}
              </GoldButton>
            </>
          )}
        </form>
      )}
    </Dialog>
  );
}

export function InfoModal({
  t,
  kind,
  onClose,
  onWelcome,
}: {
  t: WelcomeCopy;
  kind: 'about' | 'privacy' | 'exit';
  onClose: () => void;
  onWelcome: () => void;
}) {
  return (
    <Dialog titleId="welcome-info-title" onClose={onClose} className="civic-modal civic-info-modal">
      <p className="civic-eyebrow">FREEDOMSWORD</p>
      <h2 id="welcome-info-title">
        {kind === 'privacy' ? t.privacyTitle : kind === 'exit' ? t.exitTitle : t.aboutTitle}
      </h2>
      <Ornament small />
      <p className="civic-modal-copy">
        {kind === 'privacy' ? t.privacyCopy : kind === 'exit' ? t.exitCopy : t.aboutCopy}
      </p>
      <GoldButton type="button" onClick={onClose}>
        {t.keepExploring}
      </GoldButton>
      {kind === 'exit' && (
        <button type="button" className="civic-text-button" onClick={onWelcome}>
          {t.backWelcome}
        </button>
      )}
    </Dialog>
  );
}
