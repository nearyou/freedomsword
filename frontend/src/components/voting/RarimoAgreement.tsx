'use client';
import { useEffect, useState } from 'react';
import { api } from '@frontend/lib/client-api';

type Agreement = { text: string; textHash: string; version: number };

export default function RarimoAgreement({ onAccepted }: { onAccepted: () => Promise<void> }) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    void api<Agreement>('agreement').then(setAgreement).catch(() =>
      setError('Could not load the citizen agreement. Please retry.'));
  }, []);
  async function accept() {
    if (!agreement || !checked) return;
    setBusy(true);
    setError('');
    try {
      await api('agreement', { accepted: true, textHash: agreement.textHash });
      try { await onAccepted(); }
      catch { setError('Agreement accepted, but refreshing your ballot was interrupted. Reload to continue.'); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Agreement could not be accepted.');
    } finally { setBusy(false); }
  }
  return <div className="private-step">
    <h4>Accept the citizen agreement</h4>
    {!agreement && !error && <p>Loading agreement…</p>}
    {agreement && <>
      <p>Version {agreement.version} · SHA-256 {agreement.textHash}</p>
      <details><summary>View agreement</summary><pre className="agreement-text">{agreement.text}</pre></details>
      <label><input type="checkbox" checked={checked}
        onChange={(event) => setChecked(event.target.checked)} /> I have read and accept the agreement.</label>
      <button className="button primary" disabled={busy || !checked} onClick={() => void accept()}>
        Accept agreement
      </button>
    </>}
    {error && <p role="alert" className="disabled-reason">{error}</p>}
  </div>;
}
