'use client';
import { useState } from 'react';
import ZkPassportQrCode, { ProofRequestStatuses } from '@rarimo/zk-passport-react';
import type { CustomProofParams, ZkProof } from '@rarimo/zk-passport';
import { api } from '@frontend/lib/client-api';

type ProofRequest = CustomProofParams;
type Registration = { registered: true; stateIndex: number; signupTxHash: string };

export default function RarimoRegistration({ electionId, publicKeyX, publicKeyY, onRegistered }: {
  electionId: string;
  publicKeyX: string;
  publicKeyY: string;
  onRegistered: () => Promise<void>;
}) {
  const [request, setRequest] = useState<ProofRequest | null>(null);
  const [requestId, setRequestId] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setBusy(true);
    setError('');
    try {
      const options = await api<ProofRequest>('private/rarimo-request', {
        electionId, publicKeyX, publicKeyY,
      });
      setRequestId(crypto.randomUUID());
      setRequest(options);
      setStatus('Scan the code with RariMe, or tap it on this phone.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not prepare verification.');
    } finally { setBusy(false); }
  }

  async function finish(proof: ZkProof) {
    setBusy(true);
    setError('');
    setStatus('Proof received. Verifying it on Rarimo L2…');
    try {
      await api<Registration>('private/rarimo-register', {
        electionId, publicKeyX, publicKeyY, proof,
      });
      setStatus('Rarimo proof verified and MACI key registered.');
      try { await onRegistered(); }
      catch { setError('Registration succeeded, but refreshing your ballot was interrupted. Reload to continue.'); }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Rarimo registration failed.');
      setStatus('Registration could not be confirmed. Retry with the same proof or start a new request.');
    } finally { setBusy(false); }
  }

  return <div className="rarimo-registration">
    <p>Prove Ukrainian citizenship and age 18+ with RariMe. Your passport and birth date stay out of FreedomSword. The proof is bound to this election and your MACI key.</p>
    {!request && <button className="button primary" disabled={busy} onClick={() => void start()}>
      {busy ? 'Preparing…' : 'Start Rarimo verification'}
    </button>}
    {request && <>
      <ZkPassportQrCode key={requestId} requestId={requestId}
        apiUrl="https://api.app.rarime.com"
        verificationOptions={request} qrProps={{ size: 210, bgColor: '#ffffff', fgColor: '#292722' }}
        onStatusChange={(next) => {
          if (next === ProofRequestStatuses.VerificationRequested)
            setStatus('Scan with RariMe, or tap the code on this phone.');
          else if (next === ProofRequestStatuses.Verified)
            setStatus('Proof received. Verifying it on-chain…');
        }}
        onSuccess={(proof) => void finish(proof)}
        onError={(cause) => setError(cause.message)}
        aria-label="Open Rarimo passport verification" />
      <button className="button secondary" disabled={busy} onClick={() => void start()}>Start a new proof request</button>
    </>}
    {status && <p role="status">{status}</p>}
    {error && <p role="alert" className="disabled-reason">{error}</p>}
    <p>Rarimo proof verification is on Rarimo L2. A submitted proof is not a ballot.</p>
  </div>;
}
