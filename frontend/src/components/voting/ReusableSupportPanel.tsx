'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ClientApiError } from '@frontend/lib/client-api';
import type { ElectionView } from '@frontend/lib/contracts';
import { electionOpen, timeLabel } from '@frontend/lib/ui';
import Dialog from '../ui/Dialog';
import ShareInvite from './ShareInvite';
import SupportSlider from './SupportSlider';
import { supportAdjustment } from '@frontend/lib/support-adjustment';

interface SupportState {
  totalUnits: number;
  activeUnits: number;
  availableUnits: number;
  coolingUnits: number;
  allocations: { candidateId: string; units: number }[];
  withdrawals: { units: number; availableAt: string }[];
}
type Command = { electionId: string; candidateId: string; action: 'allocate' | 'withdraw';
  units: number; requestId: string };

export default function ReusableSupportPanel({ election, connected, ready, now, onPassport, onRefresh, initialCandidateId }: {
  election: ElectionView;
  connected: boolean;
  ready: boolean;
  now: number;
  onPassport: () => void;
  onRefresh: () => Promise<void>;
  initialCandidateId?: string;
}) {
  const [state, setState] = useState<SupportState | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [candidateId, setCandidateId] = useState(initialCandidateId ?? '');
  const [draft, setDraft] = useState<{ candidateId: string; current: number; available: number; target: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Command | null>(null);
  const [retry, setRetry] = useState<Command | null>(null);
  const lock = useRef(false);
  const currentCandidate = candidateId || state?.allocations[0]?.candidateId || election.candidates[0]?.id || '';
  const candidate = election.candidates.find((item) => item.id === currentCandidate);
  const selectedUnits = state?.allocations.find((item) => item.candidateId === currentCandidate)?.units ?? 0;
  const availableUnits = state?.availableUnits ?? 0;
  const target = draft?.candidateId === currentCandidate && draft.current === selectedUnits && draft.available === availableUnits
    ? draft.target : selectedUnits;
  const adjustment = supportAdjustment(selectedUnits, target, availableUnits);
  const canAct = ready && electionOpen(election, now) && !!state && !busy && !retry;
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!connected) return;
    const revision = ++generation.current;
    try {
      const next = await api<SupportState>(`support?electionId=${encodeURIComponent(election.id)}`);
      if (revision === generation.current) { setState(next); setError(''); }
    } catch (failure) {
      if (revision === generation.current)
        setError(failure instanceof Error ? failure.message : 'Your support could not be refreshed.');
    }
  }, [connected, election.id]);
  useEffect(() => {
    const revision = generation;
    const initial = setTimeout(() => { setState(null); void refresh(); }, 0);
    const timer = setInterval(() => { if (!document.hidden && !lock.current) void refresh(); }, 30_000);
    return () => { clearTimeout(initial); clearInterval(timer); revision.current++; };
  }, [refresh]);

  function prepare(action: Command['action'], requestedUnits: number) {
    if (!canAct || requestedUnits <= 0 || (action === 'withdraw' ? requestedUnits > selectedUnits : requestedUnits > availableUnits)) return;
    setConfirm({ electionId: election.id, candidateId: currentCandidate, action,
      units: requestedUnits, requestId: crypto.randomUUID() });
  }
  async function execute(command: Command) {
    if (lock.current) return;
    lock.current = true;
    generation.current++;
    setBusy(true); setError(''); setNotice('');
    try {
      const next = await api<SupportState>('support', command);
      setState(next); setRetry(null); setConfirm(null); setDraft(null);
      setNotice(command.action === 'withdraw'
        ? `${command.units} units recalled. Each withdrawal unlocks six calendar months later.`
        : `${command.units} units allocated.`);
      // The mutation is committed. A failed public-results refresh must not offer it as a new action.
      try { await onRefresh(); } catch { setNotice((message) => `${message} Public results could not refresh yet.`); }
    } catch (failure) {
      if (!(failure instanceof ClientApiError) || failure.status === 0 || failure.status >= 500)
        setRetry(command);
      else await refresh();
      setError(failure instanceof Error ? failure.message : 'The action could not be confirmed.');
      setConfirm(null);
    } finally { lock.current = false; setBusy(false); }
  }

  return <div className="reusable-support">
    <section className="panel" aria-labelledby="support-title">
      <h2 id="support-title">Your voice, your choice</h2>
      <p>You start with the same 100 support units as everyone else in this election.
        Choose who to support, and change your mind when you need to. Each withdrawal
        becomes available again six calendar months later.</p>
      {!connected ? <button className="button primary" onClick={onPassport}>Connect Telegram</button> : <>
        {state && <>
          <dl className="support-budget">
            <div><dt>Available</dt><dd>{state.availableUnits}</dd></div>
            <div><dt>Supporting candidates</dt><dd>{state.activeUnits}</dd></div>
            <div><dt>Cooling down</dt><dd>{state.coolingUnits}</dd></div>
          </dl>
          <h3>People you support</h3>
          {state.allocations.length ? <ul className="support-allocations">
            {state.allocations.map((entry) => <li key={entry.candidateId}>
              <span>{election.candidates.find((item) => item.id === entry.candidateId)?.fullName ?? 'Candidate'}</span>
              <strong>{entry.units} units</strong>
            </li>)}
          </ul> : <p>Ready when you are. Choose a candidate below to get started.</p>}
          <div className="support-form">
            <label>Candidate<select value={currentCandidate} disabled={busy || !!retry}
              onChange={(event) => setCandidateId(event.target.value)}>
              {election.candidates.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
              {state.allocations.filter((entry) => !election.candidates.some((item) => item.id === entry.candidateId))
                .map((entry) => <option key={entry.candidateId} value={entry.candidateId}>Withdrawn candidate · {entry.units} units</option>)}
            </select></label>
            <SupportSlider current={selectedUnits} maximum={selectedUnits + availableUnits} value={target}
              disabled={busy || !!retry} onChange={(value) => setDraft({ candidateId: currentCandidate,
                current: selectedUnits, available: availableUnits, target: value })} />
            <p className="support-keep">Currently supporting this candidate: {selectedUnits} units.
              {adjustment?.action === 'withdraw' && <> Recall {adjustment.units} units · Keep {target} units.</>}
              {adjustment?.action === 'allocate' && <> Add {adjustment.units} units · Keep {target} units.</>}</p>
            {!adjustment && <p className="fine-print">Move the slider left to recall support, or right to add available units.</p>}
            {state.coolingUnits > 0 && <p className="fine-print">{state.coolingUnits} recalled units are cooling down. They can only be added again after their six-month timers end.</p>}
            <div className="support-actions">
              <button className="button primary support-submit" data-action={adjustment?.action}
                disabled={!canAct || !adjustment || (adjustment.action === 'allocate' && !candidate)}
                onClick={() => { if (adjustment) prepare(adjustment.action, adjustment.units); }}>
                {adjustment ? `${adjustment.action === 'withdraw' ? 'Recall' : 'Add'} ${adjustment.units} units` : 'Choose a change above'}</button>
              <button className="button danger" disabled={!canAct || selectedUnits === 0}
                onClick={() => prepare('withdraw', selectedUnits)}>Recall all {selectedUnits} units from this candidate</button>
            </div>
          </div>
          {!ready && <button className="button secondary" onClick={onPassport}>Get ready to take part</button>}
          {!electionOpen(election, now) && <p>Changes are available only while this election is open.</p>}
          {state.withdrawals.length > 0 && <section className="support-cooldowns">
            <h3>When your recalled units return</h3>
            <ul>{state.withdrawals.map((entry, index) => <li key={`${entry.availableAt}-${index}`}>
              <strong>{entry.units} units</strong><time dateTime={entry.availableAt}>{timeLabel(entry.availableAt)}</time>
            </li>)}</ul>
            <p>After each timer ends, allocate those units to the same candidate or others, in parts or in full.
              Recalling them again starts a new six-month timer.</p>
          </section>}
        </>}
        {!state && !error && <p role="status">Loading your support…</p>}
        {error && <p role="alert">{error}</p>}
        {retry ? <button className="button secondary" disabled={busy} onClick={() => void execute(retry)}>
          Retry the same action safely
        </button> : error && <button className="button secondary" disabled={busy} onClick={() => void refresh()}>Refresh support</button>}
        {notice && <p role="status">{notice}</p>}
      </>}
      <p className="fine-print">Fictional-election demo. The operator can correlate accounts and allocations.
        The application enforces this budget; blockchain records anchor audit commitments.</p>
    </section>
    {!!state?.activeUnits && <ShareInvite />}
    {confirm && <Dialog portal titleId="support-confirm-title" onClose={() => setConfirm(null)} busy={busy}>
      <h2 id="support-confirm-title">{confirm.action === 'withdraw' ? 'Recall' : 'Allocate'} {confirm.units} units?</h2>
      <p>{election.candidates.find((item) => item.id === confirm.candidateId)?.fullName}</p>
      {confirm.action === 'withdraw' && <p>These units stop supporting this candidate immediately. You can use them
        again six calendar months after this withdrawal. {Math.max(0, selectedUnits - confirm.units)} units will remain supporting this candidate.</p>}
      <div className="dialog-actions"><button className="button secondary" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
        <button className="button primary" disabled={busy} onClick={() => void execute(confirm)}>{busy ? 'Recording…' : 'Confirm'}</button>
      </div>
    </Dialog>}
  </div>;
}
