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
      {agreement ? (
        <>
          <details className="agreement-text">
            <summary>Read agreement · v{agreement.version}</summary>
            <p>{agreement.text}</p>
            <div className="agreement-meta">SHA-256 document hash</div>
            <code className="document-hash">{agreement.textHash}</code>
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
