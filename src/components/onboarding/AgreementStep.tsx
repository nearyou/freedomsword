import type { AgreementDocument } from './CitizenPassport';
export default function AgreementStep({
  agreement,
  accepted,
  onAccepted,
  signed,
  verified,
  busy,
  error,
  onLoad,
  onAccept,
}: {
  agreement: AgreementDocument | null;
  accepted: boolean;
  onAccepted: (accepted: boolean) => void;
  signed: boolean;
  verified: boolean;
  busy: boolean;
  error: string;
  onLoad: () => void;
  onAccept: () => void;
}) {
  return (
    <>
      <p>
        {signed
          ? 'Your acceptance is recorded.'
          : 'Review the participation rules and privacy explanation.'}
      </p>
      {agreement ? (
        <>
          <div className="agreement-meta">
            <span>Agreement v{agreement.version}</span>
            <span>SHA-256 document hash</span>
          </div>
          <code className="document-hash">{agreement.textHash}</code>
          <details className="agreement-text">
            <summary>View agreement</summary>
            <p>{agreement.text}</p>
          </details>
          {!signed && (
            <>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={accepted}
                  disabled={!verified || busy}
                  onChange={(event) => onAccepted(event.target.checked)}
                />
                I have read and accept this agreement.
              </label>
              <button
                className="button primary full"
                disabled={!verified || !accepted || busy}
                onClick={onAccept}
              >
                Accept citizen agreement
              </button>
            </>
          )}
        </>
      ) : (
        <button className="button secondary full" disabled={busy} onClick={onLoad}>
          Load agreement
        </button>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {!verified && !signed && (
        <p className="disabled-reason">Complete eligibility verification first.</p>
      )}
    </>
  );
}
