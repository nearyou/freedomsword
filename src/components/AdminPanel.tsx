'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ThemeControl from './ThemeControl';

type AdminElection = {
  id: string; title: string; description: string; type: string; status: string;
  opensAt: string; closesAt: string;
  recallEnabled: boolean; fullRecallEnabled: boolean; partialRecallEnabled: boolean;
  partialRecallAmount: number; firstRecallDelaySeconds: number;
  recallCooldownSeconds: number; maxRecallOperations: number | null;
  candidates: { id: string; fullName: string; withdrawn: boolean; platforms: { id: string; version: number; title: string; contentHash: string; promises: { id: string; title: string }[] }[] }[];
};
type Action = 'create' | 'edit' | 'addCandidate' | 'removeCandidate' | 'platform' | 'promise' | 'activate' | 'close' | 'archive' | 'recallPolicy';
const labels: Record<Action, string> = {
  create: 'Create election', edit: 'Edit election', addCandidate: 'Add candidate',
  removeCandidate: 'Withdraw candidate', platform: 'Create platform version',
  promise: 'Create promise', activate: 'Activate election', close: 'Close election', archive: 'Archive election',
  recallPolicy: 'Set recall policy',
};
function input(form: FormData, key: string) { return String(form.get(key) ?? '').trim(); }
export default function AdminPanel() {
  const [elections, setElections] = useState<AdminElection[]>([]);
  const [action, setAction] = useState<Action>('create');
  const [electionId, setElectionId] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const refresh = useCallback(async () => {
    const response = await fetch('/api/admin/elections', { cache: 'no-store' });
    setAuthorized(response.ok);
    if (response.ok) {
      const data = await response.json() as { elections: AdminElection[] };
      setElections(data.elections);
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(initial);
  }, [refresh]);
  const selected = elections.find((e) => e.id === electionId);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { action };
    if (action !== 'create') payload.electionId = electionId;
    if (action === 'create' || action === 'edit') {
      Object.assign(payload, { title: input(form, 'title'), description: input(form, 'description'),
        type: input(form, 'type'), opensAt: new Date(input(form, 'opensAt')).toISOString(),
        closesAt: new Date(input(form, 'closesAt')).toISOString() });
    }
    if (action === 'addCandidate') for (const key of ['fullName', 'party', 'ideology', 'bio', 'color']) payload[key] = input(form, key);
    if (action === 'removeCandidate' || action === 'platform') payload.candidateId = input(form, 'candidateId');
    if (action === 'platform') for (const key of ['title', 'content']) payload[key] = input(form, key);
    if (action === 'promise') for (const key of ['platformId', 'title']) payload[key] = input(form, key);
    if (action === 'recallPolicy') {
      for (const key of ['recallEnabled', 'fullRecallEnabled', 'partialRecallEnabled']) payload[key] = form.get(key) === 'on';
      for (const key of ['partialRecallAmount', 'firstRecallDelaySeconds', 'recallCooldownSeconds']) payload[key] = Number(input(form, key));
      payload.maxRecallOperations = input(form, 'maxRecallOperations') ? Number(input(form, 'maxRecallOperations')) : null;
    }
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/admin/elections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string; electionId?: string };
      if (!response.ok) throw new Error(result.error ?? 'Administrative change failed');
      setNotice(`${labels[action]} saved and audited.`);
      if (action === 'create' && result.electionId) setElectionId(result.electionId);
      await refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Administrative change failed'); }
    finally { setBusy(false); }
  }
  return <main className="admin-page">
    <div className="admin-heading"><div><p className="eyebrow">DYNAMIC DEMOCRACY</p><h1>Election management</h1></div><div className="admin-actions"><ThemeControl /><Link href="/">Back to public app</Link></div></div>
    {authorized === false && <section className="admin-card" role="alert">An authenticated election manager role is required.</section>}
    {authorized && <div className="admin-grid">
      <section className="admin-card"><h2>Elections</h2>
        {elections.map((e) => <button type="button" key={e.id} className="admin-election" onClick={() => setElectionId(e.id)} aria-pressed={e.id === electionId}>
          <strong>{e.title}</strong><span>{e.status} · {e.type}</span><small>{new Date(e.opensAt).toLocaleString()} – {new Date(e.closesAt).toLocaleString()}</small>
        </button>)}
      </section>
      <section className="admin-card"><h2>Change election</h2><p>Changes are audited. Candidate and platform changes are limited to elections that have not started.</p>
        <label>Action<select value={action} onChange={(e) => setAction(e.target.value as Action)}>{Object.entries(labels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
        {action !== 'create' && <label>Election<select value={electionId} onChange={(e) => setElectionId(e.target.value)}><option value="">Choose election</option>{elections.map((e) => <option key={e.id} value={e.id}>{e.title} ({e.status})</option>)}</select></label>}
        <form key={`${action}:${electionId}`} onSubmit={(e) => void submit(e)}>
          {(action === 'create' || action === 'edit') && <>
            <label>Title<input name="title" required maxLength={160} defaultValue={action === 'edit' ? selected?.title : ''} /></label>
            <label>Description<textarea name="description" required defaultValue={action === 'edit' ? selected?.description : ''} /></label>
            <label>Type<select name="type" defaultValue={action === 'edit' ? selected?.type : 'COUNCIL'}><option>COUNCIL</option><option>BUDGET</option><option>COMMUNITY</option></select></label>
            <label>Start time<input name="opensAt" type="datetime-local" required defaultValue={action === 'edit' ? selected?.opensAt.slice(0, 16) : ''} /></label>
            <label>End time<input name="closesAt" type="datetime-local" required defaultValue={action === 'edit' ? selected?.closesAt.slice(0, 16) : ''} /></label>
          </>}
          {action === 'addCandidate' && <><label>Full name<input name="fullName" required /></label><label>Party<input name="party" required /></label><label>Ideology<input name="ideology" required /></label><label>Biography<textarea name="bio" required /></label><label>Badge color<input name="color" type="color" defaultValue="#3675e6" /></label></>}
          {(action === 'removeCandidate' || action === 'platform') && <label>Candidate<select name="candidateId" required><option value="">Choose candidate</option>{selected?.candidates.filter((c) => !c.withdrawn).map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}</select></label>}
          {action === 'platform' && <><label>Platform title<input name="title" required /></label><label>Platform content<textarea name="content" required /></label></>}
          {action === 'promise' && <><label>Platform<select name="platformId" required><option value="">Choose platform</option>{selected?.candidates.flatMap((c) => c.platforms.map((p) => <option key={p.id} value={p.id}>{c.fullName} · v{p.version}</option>))}</select></label><label>Promise title<input name="title" required /></label></>}
          {action === 'recallPolicy' && <>
            <label><input name="recallEnabled" type="checkbox" defaultChecked={selected?.recallEnabled ?? true} /> Recall enabled</label>
            <label><input name="fullRecallEnabled" type="checkbox" defaultChecked={selected?.fullRecallEnabled ?? true} /> Full recall enabled</label>
            <label><input name="partialRecallEnabled" type="checkbox" defaultChecked={selected?.partialRecallEnabled ?? true} /> Partial recall enabled</label>
            <label>Partial recall amount<input name="partialRecallAmount" type="number" min="1" max="100" required defaultValue={selected?.partialRecallAmount ?? 25} /></label>
            <label>Delay before first recall (seconds)<input name="firstRecallDelaySeconds" type="number" min="0" max="31536000" required defaultValue={selected?.firstRecallDelaySeconds ?? 0} /></label>
            <label>Cooldown between recalls (seconds)<input name="recallCooldownSeconds" type="number" min="0" max="31536000" required defaultValue={selected?.recallCooldownSeconds ?? 0} /></label>
            <label>Maximum recall operations (blank means unlimited)<input name="maxRecallOperations" type="number" min="1" max="100" defaultValue={selected?.maxRecallOperations ?? ''} /></label>
          </>}
          <button className="button primary" disabled={busy || (action !== 'create' && !selected)}>{busy ? 'Saving…' : labels[action]}</button>
        </form>
        {notice && <p role="status">{notice}</p>}
      </section>
    </div>}
  </main>;
}
