'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Users,
  FileText,
  CheckCheck,
  SlidersHorizontal,
  Play,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import ThemeControl from './ThemeControl';
import BrandMark from './ui/BrandMark';
import Dialog from './ui/Dialog';
import LoadingCards from './ui/LoadingCards';
import AdminActionFields from './admin/AdminActionFields';
import {
  labels,
  requiresConfirmation,
  destructive,
  displayedStatus,
  type AdminAction,
  type AdminElection,
} from './admin/types';
import { api, ClientApiError } from '@/lib/client-api';
import { dateLabel, electionLabels } from '@/lib/ui';
const sections: { name: string; icon: typeof Users; actions: AdminAction[] }[] = [
  { name: 'Election', icon: CalendarDays, actions: ['create', 'edit'] },
  { name: 'Candidates', icon: Users, actions: ['addCandidate', 'removeCandidate'] },
  { name: 'Platforms', icon: FileText, actions: ['platform'] },
  { name: 'Promises', icon: CheckCheck, actions: ['promise'] },
  { name: 'Recall policy', icon: SlidersHorizontal, actions: ['recallPolicy'] },
  { name: 'Lifecycle', icon: Play, actions: ['activate', 'close', 'archive'] },
];
const input = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
export default function AdminPanel() {
  const [elections, setElections] = useState<AdminElection[]>([]);
  const [action, setAction] = useState<AdminAction>('create');
  const [electionId, setElectionId] = useState('');
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [now, setNow] = useState(0);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [refreshError, setRefreshError] = useState('');
  const [confirmation, setConfirmation] = useState<{
    action: AdminAction;
    payload: Record<string, unknown>;
    election: string;
    candidate?: string;
  } | null>(null);
  const refresh = useCallback(async () => {
    try {
      const data = await api<{ elections: AdminElection[] }>('admin/elections');
      setElections(data.elections);
      setAuthorized(true);
      setRefreshError('');
    } catch (error) {
      if (error instanceof ClientApiError && [401, 403].includes(error.status)) {
        setAuthorized(false);
        setElections([]);
      } else
        setRefreshError(
          'Election management could not refresh. Last loaded configuration is preserved.',
        );
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => {
      setNow(Date.now());
      void refresh();
    }, 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [refresh]);
  const selected = elections.find((election) => election.id === electionId);
  const section = sections.find((section) => section.actions.includes(action))!;
  const selectedStatus = selected && displayedStatus(selected, now);
  const blocked =
    action === 'create'
      ? ''
      : !selected
        ? 'Select an election first.'
        : action === 'close'
          ? selectedStatus === 'ACTIVE'
            ? ''
            : 'Only an active election can be closed.'
          : action === 'archive'
            ? selectedStatus === 'FINISHED'
              ? ''
              : 'Only a finished election can be archived.'
            : selectedStatus !== 'DRAFT'
              ? 'Configuration changes and activation require a draft.'
              : action === 'activate' && now >= new Date(selected.closesAt).getTime()
                ? 'Reschedule this draft before activating it.'
                : '';
  async function save(payload: Record<string, unknown>, performed: AdminAction) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const result = await api<{ electionId?: string }>('admin/elections', payload);
      setNotice({ text: `${labels[performed]} saved and audited.`, error: false });
      setConfirmation(null);
      if (performed === 'create' && result.electionId) {
        setElectionId(result.electionId);
        setAction('edit');
      }
      await refresh();
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : 'Change could not be saved. Please retry.',
        error: true,
      });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked || busy) return;
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { action };
    if (action !== 'create') payload.electionId = electionId;
    if (action === 'create' || action === 'edit')
      Object.assign(payload, {
        title: input(form, 'title'),
        description: input(form, 'description'),
        type: input(form, 'type'),
        opensAt: new Date(input(form, 'opensAt')).toISOString(),
        closesAt: new Date(input(form, 'closesAt')).toISOString(),
      });
    if (action === 'addCandidate')
      for (const key of ['fullName', 'party', 'ideology', 'bio', 'color'])
        payload[key] = input(form, key);
    if (action === 'removeCandidate' || action === 'platform')
      payload.candidateId = input(form, 'candidateId');
    if (action === 'platform')
      for (const key of ['title', 'content']) payload[key] = input(form, key);
    if (action === 'promise')
      for (const key of ['platformId', 'title']) payload[key] = input(form, key);
    if (action === 'recallPolicy') {
      for (const key of ['recallEnabled', 'fullRecallEnabled', 'partialRecallEnabled'])
        payload[key] = form.get(key) === 'on';
      for (const key of ['partialRecallAmount', 'firstRecallDelaySeconds', 'recallCooldownSeconds'])
        payload[key] = Number(input(form, key));
      payload.maxRecallOperations = input(form, 'maxRecallOperations')
        ? Number(input(form, 'maxRecallOperations'))
        : null;
    }
    if (requiresConfirmation(action))
      setConfirmation({
        action,
        payload,
        election: selected?.title ?? '',
        candidate: selected?.candidates.find((candidate) => candidate.id === payload.candidateId)
          ?.fullName,
      });
    else void save(payload, action);
  }
  return (
    <main className="admin-page">
      <div className="admin-heading">
        <div className="admin-title">
          <BrandMark />
          <div>
            <p className="eyebrow">
              <ShieldCheck size={14} />
              ELECTION MANAGER
            </p>
            <h1>Election management</h1>
          </div>
        </div>
        <div className="admin-actions">
          <ThemeControl />
          <Link href="/">Back to public app</Link>
        </div>
      </div>
      {refreshError && (
        <div className="refresh-banner" role="alert">
          <p>{refreshError}</p>
          <button className="button secondary" onClick={() => void refresh()}>
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      )}
      {authorized === null && !refreshError && (
        <LoadingCards label="Checking election manager access" />
      )}
      {authorized === false && (
        <section className="admin-card empty-state" role="alert">
          <ShieldCheck size={30} />
          <h2>Election manager access required</h2>
          <p>
            Connect your account in the public app. An operator must grant the election-manager role
            before you can manage elections.
          </p>
          <Link className="button primary" href="/">
            Open Citizen Passport
          </Link>
        </section>
      )}
      {authorized && (
        <div className="admin-grid">
          <section className="admin-card">
            <div className="panel-heading">
              <h2>Elections</h2>
              <span className="state-badge">{elections.length} total</span>
            </div>
            {elections.map((election) => (
              <button
                type="button"
                className="admin-election"
                key={election.id}
                aria-pressed={election.id === electionId}
                disabled={busy}
                onClick={() => setElectionId(election.id)}
              >
                <strong>{election.title}</strong>
                <span>
                  <span
                    className={`state-badge state-${displayedStatus(election, now).toLowerCase()}`}
                  >
                    {displayedStatus(election, now)}
                  </span>
                  <small>{electionLabels[election.type] ?? election.type}</small>
                </span>
                <small>
                  {dateLabel(election.opensAt)} – {dateLabel(election.closesAt)} · UTC
                </small>
                <small>
                  {election.candidates.filter((candidate) => !candidate.withdrawn).length}{' '}
                  candidates
                </small>
              </button>
            ))}
            {!elections.length && <p>No elections yet. Create your first draft.</p>}
          </section>
          <section className="admin-card">
            <div className="panel-heading">
              <h2>{selected?.title ?? 'Management actions'}</h2>
              {selected && (
                <span className={`state-badge state-${selectedStatus?.toLowerCase()}`}>
                  {selectedStatus}
                </span>
              )}
            </div>
            <div className="admin-sections" aria-label="Management sections">
              {sections.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  aria-pressed={section.name === item.name}
                  disabled={busy}
                  onClick={() => {
                    setAction(item.actions[0]);
                    setNotice(null);
                  }}
                >
                  <item.icon size={16} />
                  {item.name}
                </button>
              ))}
            </div>
            <h3>{section.name}</h3>
            <p>Changes are audited. Draft configuration is frozen when activated.</p>
            {section.actions.length > 1 && (
              <div className="action-switcher">
                {section.actions.map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={action === value}
                    className={destructive(value) ? 'destructive' : ''}
                    disabled={busy}
                    onClick={() => {
                      setAction(value);
                      setNotice(null);
                    }}
                  >
                    {labels[value]}
                  </button>
                ))}
              </div>
            )}
            {action !== 'create' && (
              <label>
                Selected election
                <select
                  value={electionId}
                  disabled={busy}
                  onChange={(event) => setElectionId(event.target.value)}
                >
                  <option value="">Choose election</option>
                  {elections.map((election) => (
                    <option value={election.id} key={election.id}>
                      {election.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <form key={`${action}:${electionId}`} onSubmit={submit}>
              <fieldset disabled={busy || !!blocked}>
                <AdminActionFields action={action} selected={selected} />
              </fieldset>
              {blocked && (
                <p className="disabled-reason" role="status">
                  {blocked}
                </p>
              )}
              <button
                className={`button ${destructive(action) ? 'danger' : 'primary'}`}
                disabled={busy || !!blocked}
              >
                {busy
                  ? 'Saving…'
                  : requiresConfirmation(action)
                    ? `Review ${labels[action].toLowerCase()}`
                    : labels[action]}
              </button>
            </form>
            {notice && (
              <p
                className={`admin-notice ${notice.error ? 'error' : ''}`}
                role={notice.error ? 'alert' : 'status'}
              >
                {notice.text}
              </p>
            )}
          </section>
        </div>
      )}
      {confirmation && (
        <Dialog titleId="admin-confirm-title" onClose={() => setConfirmation(null)} busy={busy}>
          <p className="eyebrow">REVIEW MANAGEMENT ACTION</p>
          <h2 id="admin-confirm-title">{labels[confirmation.action]}?</h2>
          <p className="modal-copy">
            <strong>{confirmation.election}</strong>
            {confirmation.candidate && <> · {confirmation.candidate}</>}
          </p>
          <p className="modal-copy">
            {confirmation.action === 'activate'
              ? 'This publishes the election and locks its configuration. Voting starts at the scheduled opening time, or immediately if that time has passed.'
              : confirmation.action === 'removeCandidate'
                ? 'This withdraws the selected candidate from the draft and retains their record.'
                : confirmation.action === 'close'
                  ? 'This ends voting and recall immediately. Ballot and audit records are retained.'
                  : 'This archives the finished election and preserves its public evidence.'}
          </p>
          {notice?.error && (
            <p className="field-error" role="alert">
              {notice.text}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              Cancel
            </button>
            <button
              className={`button ${destructive(confirmation.action) ? 'danger' : 'primary'}`}
              disabled={busy}
              onClick={() => void save(confirmation.payload, confirmation.action)}
            >
              {busy ? 'Saving…' : 'Confirm action'}
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
