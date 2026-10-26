'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { CitizenView, ElectionView } from '@frontend/lib/contracts';
import { api, ClientApiError } from '@frontend/lib/client-api';
import type { MaciJoiningData } from '@frontend/lib/maci-join';
import { publicKeyForPrivateKey } from '@frontend/lib/maci-device';

type DeviceBackup = { electionId: string; privateKey: string; pollStateIndex: number | null; nonce: number };
type Registration = { registered: true; stateIndex: number; signupTxHash: string };
type Join = { joined: true; pollStateIndex: number; joinTxHash: string };
type Submission = { submitted: true; counted: false; txHash: string };
const RarimoRegistration = dynamic(() => import('./RarimoRegistration'), { ssr: false });
const RarimoAgreement = dynamic(() => import('./RarimoAgreement'), { ssr: false });

function storageKey(electionId: string) { return `freedomsword:maci-local:${electionId}`; }
function readBackup(electionId: string): DeviceBackup | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(storageKey(electionId));
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as DeviceBackup;
    return saved.electionId === electionId && typeof saved.privateKey === 'string' &&
      Number.isSafeInteger(saved.nonce) && saved.nonce >= 1 ? saved : null;
  } catch { return null; }
}

export default function PrivateBallotPanel({ election, citizen, ready, now, onPassport, onRefresh }: {
  election: ElectionView;
  citizen: CitizenView;
  ready: boolean;
  now: number;
  onPassport: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [device, setDevice] = useState<DeviceBackup | null>(() => readBackup(election.id));
  const [importText, setImportText] = useState('');
  const [showBackup, setShowBackup] = useState(false);
  const [candidateId, setCandidateId] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const poll = election.privatePoll;
  const registration = citizen.privateRegistrations?.find((item) => item.electionId === election.id);
  let devicePublicKey: { publicKeyX: string; publicKeyY: string } | null = null;
  if (device) {
    try { devicePublicKey = publicKeyForPrivateKey(device.privateKey); }
    catch { /* A damaged backup cannot be used for Rarimo registration. */ }
  }

  function save(next: DeviceBackup) {
    sessionStorage.setItem(storageKey(election.id), JSON.stringify(next));
    setDevice(next);
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setNotice('');
    try { await action(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Action failed. Please retry.'); }
    finally { setBusy(false); }
  }
  if (!poll) return (
    <div className="panel ballot-panel empty-state">
      <h3>Private ballot</h3>
      <p>This election does not yet have a configured MACI poll. Private voting is unavailable.</p>
    </div>
  );
  if (!((poll.registrationMode === 'LOCAL_TEST' && poll.chainId === 31337) ||
    (poll.registrationMode === 'RARIMO' && poll.chainId === 7368))) return (
    <div className="panel ballot-panel empty-state">
      <h3>Private ballot</h3>
      <p>Rarimo eligibility and private voting are not yet available for this election.</p>
    </div>
  );
  const rarimo = poll.registrationMode === 'RARIMO';
  const connected = rarimo ? citizen.connected : ready;
  const agreementReady = rarimo ? citizen.agreementSigned : ready;
  const wasmUrl = process.env.NEXT_PUBLIC_MACI_JOIN_WASM_URL;
  const zkeyUrl = process.env.NEXT_PUBLIC_MACI_JOIN_ZKEY_URL;
  const vkeyUrl = process.env.NEXT_PUBLIC_MACI_JOIN_VKEY_URL;
  const active = election.status === 'ACTIVE' &&
    now >= new Date(election.opensAt).getTime() &&
    now < new Date(election.closesAt).getTime();
  return (
    <div className="panel ballot-panel private-ballot-flow">
      <div className="panel-heading"><h3>Private ballot</h3><span className="status-badge">{rarimo ? 'RARIMO' : 'LOCAL TEST'}</span></div>
      <p>{rarimo ? 'Rarimo proves eligibility before MACI registration.' : 'Eligibility is bypassed for this local test.'} A trusted MACI coordinator can decrypt votes; the public cannot see your choice. A submitted message is not a counted vote until the final proof is verified.</p>
      {!connected && <button className="button primary" onClick={onPassport}>
        {rarimo ? 'Connect Telegram' : 'Complete Citizen Passport'}
      </button>}
      {connected && !device && <div className="private-step" data-state="current">
        <h4>1. Create or restore your MACI key</h4>
        <p>The private key stays in this browser session. Keep a backup to change your vote later.</p>
        <button className="button primary" disabled={busy} onClick={() => void run(async () => {
          const { createMaciDeviceKey } = await import('@frontend/lib/maci-device');
          const created = createMaciDeviceKey();
          save({ electionId: election.id, privateKey: created.privateKey,
            pollStateIndex: null, nonce: 1 });
          setShowBackup(true);
        })}>Create device key</button>
        <label>Restore backup
          <textarea value={importText} onChange={(event) => setImportText(event.target.value)}
            placeholder="Paste your private MACI key or FreedomSword backup JSON" rows={3} />
        </label>
        <button className="button secondary" disabled={busy || !importText.trim()}
          onClick={() => void run(async () => {
            const { publicKeyForPrivateKey } = await import('@frontend/lib/maci-device');
            const parsed = importText.trim().startsWith('{')
              ? JSON.parse(importText) as Partial<DeviceBackup> : { privateKey: importText.trim() };
            if (typeof parsed.privateKey !== 'string') throw new Error('Invalid backup');
            if (registration && (!Number.isSafeInteger(parsed.nonce) ||
              !('pollStateIndex' in parsed)))
              throw new Error('Restore the full backup with its ballot nonce for this registered key');
            const restored = publicKeyForPrivateKey(parsed.privateKey);
            if (registration && (restored.publicKeyX !== registration.publicKeyX ||
              restored.publicKeyY !== registration.publicKeyY))
              throw new Error('This key does not match your registered MACI key');
            if (parsed.electionId && parsed.electionId !== election.id)
              throw new Error('This backup belongs to another election');
            save({ electionId: election.id, privateKey: parsed.privateKey,
              pollStateIndex: Number.isSafeInteger(parsed.pollStateIndex) ? parsed.pollStateIndex! : null,
              nonce: Number.isSafeInteger(parsed.nonce) && parsed.nonce! >= 1 ? parsed.nonce! : 1 });
            setImportText('');
          })}>Restore key</button>
      </div>}
      {connected && device && <>
        <div className="private-step">
          <h4>1. Back up your MACI key</h4>
          <button className="button secondary" onClick={() => setShowBackup((value) => !value)}>
            {showBackup ? 'Hide backup' : 'Show backup'}
          </button>
          {showBackup && <textarea readOnly rows={5} aria-label="Private MACI key backup"
            value={JSON.stringify(device)} onFocus={(event) => event.target.select()} />}
          <p>Anyone with this backup can control your ballot. Store it privately. Session storage clears when this browser session ends.</p>
        </div>
        <div className="private-step"
          data-state={device.pollStateIndex !== null ? 'complete' : 'current'}>
          <h4>2. Register and join</h4>
          <p>{registration ? `MACI key registered on ${rarimo ? 'Rarimo L2' : 'the local chain'}.` : rarimo
            ? 'Verify with Rarimo to register this public key.' : 'Register your public key after mock eligibility and agreement.'}</p>
          {!registration && rarimo && devicePublicKey && <RarimoRegistration electionId={election.id}
            publicKeyX={devicePublicKey.publicKeyX} publicKeyY={devicePublicKey.publicKeyY}
            onRegistered={onRefresh} />}
          {!devicePublicKey && <p role="alert">This MACI key backup is invalid. Restore a valid backup before registering.</p>}
          {!registration && !rarimo && <button className="button primary" disabled={busy} onClick={() => void run(async () => {
            const { publicKeyForPrivateKey } = await import('@frontend/lib/maci-device');
            const publicKey = publicKeyForPrivateKey(device.privateKey);
            await api<Registration>('private/register', { electionId: election.id, ...publicKey });
            await onRefresh();
            setNotice('Public key registered. Your private key stayed on this device.');
          })}>Register public key</button>}
          {registration && rarimo && !agreementReady && <RarimoAgreement onAccepted={onRefresh} />}
          {registration && agreementReady && device.pollStateIndex === null && <>
            {!wasmUrl || !zkeyUrl || !vkeyUrl ? <p>Poll-join proof artifacts are not configured for this election.</p> :
              <button className="button primary" disabled={busy}
                onClick={() => void run(async () => {
                  const { publicKeyForPrivateKey } = await import('@frontend/lib/maci-device');
                  const own = publicKeyForPrivateKey(device.privateKey);
                  if (own.publicKeyX !== registration.publicKeyX || own.publicKeyY !== registration.publicKeyY)
                    throw new Error('This device key does not match your registration');
                  const data = await api<MaciJoiningData>(`private/join-data?electionId=${encodeURIComponent(election.id)}`);
                  const { createMaciJoinProof } = await import('@frontend/lib/maci-join');
                  const proof = await createMaciJoinProof({ privateKey: device.privateKey,
                    pollId: poll.pollId, data, wasmUrl, zkeyUrl, vkeyUrl });
                  const joined = await api<Join>('private/join', { electionId: election.id, ...proof });
                  save({ ...device, pollStateIndex: joined.pollStateIndex });
                  setNotice('Poll joined. You can now submit an encrypted ballot when voting opens.');
                })}>Generate join proof on this device</button>}
          </>}
          {device.pollStateIndex !== null && <p>Poll joined. Ballot nonce: {device.nonce}.</p>}
        </div>
        <div className="private-step"
          data-state={device.pollStateIndex === null ? 'unavailable' : 'current'}>
          <h4>3. Submit encrypted choice</h4>
          <label>Candidate
            <select value={candidateId} onChange={(event) => setCandidateId(event.target.value)}>
              <option value="">Choose a candidate</option>
              {poll.candidateIds.map((id) => {
                const candidate = election.candidates.find((item) => item.id === id);
                return <option key={id} value={id}>{candidate?.fullName ?? id}</option>;
              })}
            </select>
          </label>
          <button className="button primary" disabled={busy || !agreementReady || !active || !candidateId ||
            device.pollStateIndex === null || uncertain}
            onClick={() => void run(async () => {
              if (device.pollStateIndex === null) throw new Error('Join the poll first');
              const voteOptionIndex = poll.candidateIds.indexOf(candidateId);
              if (voteOptionIndex < 0) throw new Error('Candidate is not in this poll');
              const { encryptMaciVote, publicKeyForPrivateKey } = await import('@frontend/lib/maci-device');
              const own = publicKeyForPrivateKey(device.privateKey);
              if (!registration || own.publicKeyX !== registration.publicKeyX ||
                own.publicKeyY !== registration.publicKeyY)
                throw new Error('This device key does not match your registration');
              const ciphertext = encryptMaciVote({ privateKey: device.privateKey,
                coordinatorPublicKeyX: poll.coordinatorPublicKeyX,
                coordinatorPublicKeyY: poll.coordinatorPublicKeyY,
                pollStateIndex: device.pollStateIndex,
                voteOptionIndex, pollId: poll.pollId, nonce: device.nonce });
              try {
                const sent = await api<Submission>('private/message', { electionId: election.id,
                  ...ciphertext });
                save({ ...device, nonce: device.nonce + 1 });
                setNotice(`Encrypted message submitted (${sent.txHash.slice(0, 12)}…). It is not counted yet.`);
              } catch (error) {
                if (!(error instanceof ClientApiError) || error.status === 0 || error.status >= 500)
                  setUncertain(true);
                throw error;
              }
            })}>Submit encrypted 100-unit vote</button>
          {!active && <p>Encrypted voting is available only during the poll window.</p>}
          {uncertain && <p>Submission status is uncertain. Check the poll transaction before submitting another command with this nonce.</p>}
          <p>You may submit another choice while voting is open. Each confirmed message advances your private nonce.</p>
        </div>
      </>}
      {notice && <p role="status" className="disabled-reason">{notice}</p>}
    </div>
  );
}
