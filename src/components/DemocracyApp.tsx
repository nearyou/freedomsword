'use client';
import { useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import PromiseTracker from './PromiseTracker';
import AuditExplorer from './AuditExplorer';
import ThemeControl from './ThemeControl';
import { useModalAccessibility } from './useModalAccessibility';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Fingerprint,
  Layers3,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Vote as VoteIcon,
  WalletCards,
  X,
} from 'lucide-react';
import type { CandidateView, CitizenView, ElectionView } from '@/lib/contracts';
import { searchCandidates } from '@/lib/contracts';
import { previewElections } from '@/lib/preview';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready(): void;
        expand(): void;
        isVersionAtLeast(version: string): boolean;
        setHeaderColor(color: string): void;
        setBackgroundColor(color: string): void;
        colorScheme?: 'light' | 'dark';
        onEvent?(event: 'themeChanged', callback: () => void): void;
        offEvent?(event: 'themeChanged', callback: () => void): void;
      };
    };
  }
}
const initialCitizen: CitizenView = {
  connected: false,
  verified: false,
  agreementSigned: false,
  provider: 'MOCK',
  signedPlatforms: [],
  votes: [],
};
const electionLabels: Record<string, string> = {
  COUNCIL: 'City council',
  BUDGET: 'Budget delegate',
  COMMUNITY: 'Community representative',
};
type Action = { path: string; payload: Record<string, unknown>; success: string };
async function api<T>(path: string, payload?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: payload ? 'POST' : 'GET',
    headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}
function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
}
function count(value: number) {
  return value.toLocaleString('en-US');
}
export default function DemocracyApp({ demoEnabled }: { demoEnabled: boolean }) {
  const [elections, setElections] = useState<ElectionView[]>(previewElections);
  const [source, setSource] = useState<'preview' | 'database'>('preview');
  const [activeId, setActiveId] = useState('council-2026');
  const [citizen, setCitizen] = useState<CitizenView>(initialCitizen);
  const [tab, setTab] = useState('Candidates');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('support');
  const [profile, setProfile] = useState<CandidateView | null>(null);
  const [platformConsent, setPlatformConsent] = useState(false);
  const [onboard, setOnboard] = useState(false);
  const [agreement, setAgreement] = useState<{
    text: string;
    textHash: string;
    version: number;
  } | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [confirmation, setConfirmation] = useState<Action | null>(null);
  const [retry, setRetry] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [telegramLaunch, setTelegramLaunch] = useState<'loading' | 'ready' | 'outside' | 'failed'>('loading');
  const [authFailure, setAuthFailure] = useState('');
  const [stale, setStale] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  useModalAccessibility(
    onboard
      ? 'citizen'
      : profile
        ? `profile:${profile.id}`
        : confirmation
          ? 'confirmation'
          : auditOpen
            ? 'audit'
            : null,
  );
  const refresh = useCallback(async () => {
    try {
      const data = await api<{ elections: ElectionView[] }>('elections');
      setElections(data.elections);
      setSource('database');
      setStale(false);
    } catch {
      setStale(true);
    }
    try {
      setCitizen(await api<CitizenView>('me'));
    } catch {
      setCitizen(initialCitizen);
    }
  }, []);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 8000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setTelegramLaunch((current) => current === 'loading' ? 'failed' : current);
    }, 10_000);
    return () => clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (!onboard && !profile && !confirmation && !auditOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        setOnboard(false);
        setProfile(null);
        setConfirmation(null);
        setAuditOpen(false);
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [onboard, profile, confirmation, busy, auditOpen]);
  useEffect(() => {
    if (!notice || retry) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice, retry]);
  const election = elections.find((e) => e.id === activeId) ?? elections[0];
  const ballot = citizen.votes.find((v) => v.electionId === election?.id);
  const candidates = [...searchCandidates(election?.candidates ?? [], query)].sort((a, b) =>
    sort === 'name'
      ? a.fullName.localeCompare(b.fullName)
      : b.units - a.units || a.fullName.localeCompare(b.fullName),
  );
  const ranked = [...(election?.candidates ?? [])].sort((a, b) => b.units - a.units);
  const ready =
    citizen.connected && citizen.verified && citizen.agreementSigned && source === 'database';
  const currentProfile = profile
    ? (elections.flatMap((e) => e.candidates).find((c) => c.id === profile.id) ?? profile)
    : null;
  const open =
    election &&
    election.status === 'ACTIVE' &&
    new Date(election.opensAt) <= new Date() &&
    new Date(election.closesAt) > new Date();
  async function execute(action: Action) {
    setBusy(true);
    setNotice('');
    setRetry(null);
    try {
      await api(action.path, action.payload);
      if (action.path === 'auth') setAuthFailure('');
      setNotice(action.success);
      setConfirmation(null);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again';
      setNotice(message);
      if (action.path === 'auth') setAuthFailure(message);
      if (action.path === 'vote' || action.path === 'recall') setRetry(action);
    } finally {
      setBusy(false);
    }
  }
  async function connect(demo: boolean) {
    const initData = window.Telegram?.WebApp.initData;
    if (!demo && !initData) {
      setAuthFailure(
        telegramLaunch === 'failed'
          ? 'Telegram could not load. Reopen this Mini App from your bot.'
          : 'Open Dynamic Democracy from your Telegram bot to connect.',
      );
      return;
    }
    setAuthFailure('');
    await execute({
      path: 'auth',
      payload: demo ? { demo: true } : { initData },
      success: demo ? 'Local demo account connected.' : 'Telegram account connected.',
    });
  }
  async function logout() {
    setBusy(true);
    try {
      await api('logout', {});
      setCitizen(initialCitizen);
      setOnboard(false);
      setNotice('Signed out.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not sign out');
    } finally {
      setBusy(false);
    }
  }
  async function reviewAgreement() {
    setBusy(true);
    try {
      setAgreement(await api('agreement'));
      setAccepted(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load agreement');
    } finally {
      setBusy(false);
    }
  }
  function cast(candidate: CandidateView) {
    if (!ready) {
      setOnboard(true);
      return;
    }
    setConfirmation({
      path: 'vote',
      payload: {
        electionId: election.id,
        candidateId: candidate.id,
        requestId: crypto.randomUUID(),
      },
      success: `100 units cast for ${candidate.fullName}.`,
    });
  }
  function recall(mode: 'partial' | 'full') {
    setConfirmation({
      path: 'recall',
      payload: { electionId: election.id, mode, requestId: crypto.randomUUID() },
      success: mode === 'partial' ? `${election.recallPolicy?.partialAmount ?? 25} units recalled.` : 'All remaining units recalled.',
    });
  }
  function viewProfile(candidate: CandidateView) {
    setPlatformConsent(false);
    setProfile(candidate);
  }
  const chart = election?.activeUnits
    ? ranked.map((c) => ({ name: c.fullName, value: c.units, color: c.color }))
    : [{ name: 'No ballots yet', value: 1, color: 'var(--empty-chart)' }];
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onReady={() => {
          const webapp = window.Telegram?.WebApp;
          window.dispatchEvent(new Event('dd-telegram-ready'));
          if (!webapp?.initData) {
            setTelegramLaunch('outside');
            return;
          }
          setTelegramLaunch('ready');
          webapp.ready();
          webapp.expand();
        }}
        onError={() => setTelegramLaunch('failed')}
      />
      <div className="app-shell">
        <aside className="sidebar">
          <Link href="/" className="brand">
            <span className="brand-icon">
              <Layers3 size={23} />
            </span>
            <span>
              dynamic<span className="brand-second">democracy</span>
            </span>
          </Link>
          <div className="nav-label">YOUR CITIZEN SPACE</div>
          <nav aria-label="Main navigation">
            {[
              ['Candidates', VoteIcon, 'Elections'],
              ['Live results', BarChart3, 'Live results'],
              ['My ballot', WalletCards, 'My ballot'],
              ['Accountability', CheckCheck, 'Accountability'],
            ].map(([value, Icon, label]) => {
              const Glyph = Icon as typeof VoteIcon;
              return (
                <button
                  key={value as string}
                  className={tab === value ? 'nav-item active' : 'nav-item'}
                  onClick={() => setTab(value as string)}
                >
                  <Glyph size={19} />
                  {label as string}
                  {tab === value && <span className="nav-dot" />}
                </button>
              );
            })}
          </nav>
          <div className="sidebar-card">
            <ShieldCheck size={24} />
            <h3>Your voice stays yours.</h3>
            <p>Support can change. Keep your representatives accountable.</p>
            <button onClick={() => setOnboard(true)}>
              How it works <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="sidebar-footer">
            <span className="mini-dot" /> Telegram Mini App
            <span className="version">MVP · 0.1</span>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="mobile-brand">
              <Layers3 size={22} /> dynamic democracy
            </div>
            <div className="breadcrumb">
              Citizen space <ChevronRight size={14} />
              <strong>{tab === 'Candidates' ? 'Elections' : tab}</strong>
            </div>
            <div className="topbar-actions">
              <ThemeControl />
              <button className="connection" onClick={() => setOnboard(true)}>
                <span className={`mini-dot ${citizen.connected ? 'green' : ''}`} />
                {citizen.connected
                  ? citizen.verified
                    ? 'Mock verified citizen'
                    : 'Account connected'
                  : 'Connect Telegram'}
                <ChevronRight size={14} />
              </button>
            </div>
          </header>
          <main>
            <div className="intro">
              <div>
                <div className="eyebrow">
                  <Sparkles size={13} /> DEMOCRACY, IN MOTION
                </div>
                <h1>
                  Your voice. <span>Your choice.</span>
                </h1>
                <p>Vote with confidence. Recall with freedom. Shape what comes next.</p>
              </div>
              <div className="network-status">
                <span className={`mini-dot ${stale ? '' : 'green'}`} />
                {source === 'preview'
                  ? 'Sample preview'
                  : stale
                    ? 'Refresh interrupted'
                    : 'Live · updates every 8s'}
              </div>
            </div>
            <div className="demo-note">
              <CircleHelp size={15} />
              <span>
                {source === 'preview'
                  ? 'Sample preview · synthetic totals. Connect the database to cast real demo ballots.'
                  : 'Fictional elections · mock identity verification and blockchain. All figures below come from the database.'}
              </span>
              <button onClick={() => setOnboard(true)}>
                Learn more <ArrowRight size={14} />
              </button>
            </div>
            <section className="election-switcher" aria-label="Choose an election">
              {elections.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setActiveId(e.id);
                    setQuery('');
                  }}
                  className={`election-option ${e.id === election.id ? 'selected' : ''}`}
                >
                  <span className="election-symbol">
                    {e.type === 'COUNCIL' ? (
                      <VoteIcon size={20} />
                    ) : e.type === 'BUDGET' ? (
                      <WalletCards size={20} />
                    ) : (
                      <Users size={20} />
                    )}
                  </span>
                  <span>
                    <strong>{e.title}</strong>
                    <small>
                      {electionLabels[e.type]} · {e.candidates.length} candidates
                    </small>
                  </span>
                  {e.id === election.id && <CheckCircle2 size={17} className="selected-check" />}
                </button>
              ))}
            </section>
            <div className="content-grid">
              <div className="primary-content">
                <div className="section-heading">
                  <div>
                    <h2>
                      {tab === 'Candidates'
                        ? 'Meet your candidates'
                        : tab === 'My ballot'
                          ? 'Your support, your control'
                          : tab === 'Accountability'
                            ? 'Promises into progress'
                            : 'Every unit counts'}
                    </h2>
                    <p>
                      {tab === 'Candidates'
                        ? 'People, platforms, and the future they stand for.'
                        : election.description}
                    </p>
                  </div>
                  <span className="open-badge">
                    <span className="mini-dot green" />
                    {open ? 'Voting open' : 'Voting closed'}
                  </span>
                </div>
                <div className="tabs" role="tablist" aria-label="Election views">
                  {['Candidates', 'Live results', 'My ballot', 'Accountability'].map((t) => (
                    <button
                      role="tab"
                      aria-selected={tab === t}
                      key={t}
                      className={tab === t ? 'selected' : ''}
                      onClick={() => setTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {tab === 'Candidates' && (
                  <>
                    <div className="search-row">
                      <label className="search-field">
                        <Search size={18} />
                        <input
                          aria-label="Search candidates by full name"
                          placeholder="Search candidates by full name..."
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        {query && (
                          <button aria-label="Clear search" onClick={() => setQuery('')}>
                            <X size={15} />
                          </button>
                        )}
                      </label>
                      <select
                        aria-label="Sort candidates"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                      >
                        <option value="support">Most support</option>
                        <option value="name">Name A–Z</option>
                      </select>
                    </div>
                    <div className="candidate-grid">
                      {candidates.map((candidate) => (
                        <article key={candidate.id} className="candidate-card">
                          <div className="candidate-head">
                            <div
                              className="avatar"
                              style={
                                { '--candidate-color': candidate.color } as React.CSSProperties
                              }
                            >
                              {initials(candidate.fullName)}
                              <span className="avatar-check">
                                <Check size={10} />
                              </span>
                            </div>
                            <span
                              className="ideology"
                              style={{ '--candidate-color': candidate.color, color: candidate.color, background: `${candidate.color}15` } as React.CSSProperties}
                            >
                              {candidate.ideology}
                            </span>
                          </div>
                          <h3>{candidate.fullName}</h3>
                          <div className="party">
                            <span style={{ background: candidate.color }} />
                            {candidate.party}
                          </div>
                          <p className="candidate-bio">{candidate.bio}</p>
                          <div className="candidate-support">
                            <span>Current support</span>
                            <strong>
                              {election.activeUnits
                                ? ((candidate.units / election.activeUnits) * 100).toFixed(1)
                                : '0.0'}
                              %
                            </strong>
                          </div>
                          <div className="progress-track">
                            <span
                              style={{
                                width: `${election.activeUnits ? (candidate.units / election.activeUnits) * 100 : 0}%`,
                                background: candidate.color,
                              }}
                            />
                          </div>
                          <div className="units-label">{count(candidate.units)} vote units</div>
                          <div className="candidate-actions">
                            <button
                              className="button secondary"
                              onClick={() => viewProfile(candidate)}
                            >
                              View profile <ArrowUpRight size={14} />
                            </button>
                            <button
                              className="button primary"
                              disabled={busy || !!ballot || !open}
                              onClick={() => cast(candidate)}
                            >
                              {ballot?.candidateId === candidate.id ? (
                                <>
                                  <Check size={14} /> Your ballot
                                </>
                              ) : ballot ? (
                                'Already voted'
                              ) : (
                                <>
                                  Cast vote <ArrowRight size={14} />
                                </>
                              )}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                    {!candidates.length && (
                      <div className="empty-state">
                        <Search size={28} />
                        <h3>No candidates found</h3>
                        <p>Try a different full name.</p>
                      </div>
                    )}
                  </>
                )}
                {tab === 'Live results' && (
                  <div className="panel results-panel">
                    <div className="panel-heading">
                      <h3>Live support distribution</h3>
                      <Link href={`/elections/${encodeURIComponent(election.id)}/transparency`}>Public transparency</Link>
                      <span className="subtle">100 units = 1 ballot</span>
                    </div>
                    {ranked.map((c, i) => (
                      <div className="result-row" key={c.id}>
                        <span className="rank">0{i + 1}</span>
                        <div
                          className="small-avatar"
                          style={{ color: c.color, background: `${c.color}18` }}
                        >
                          {initials(c.fullName)}
                        </div>
                        <div className="result-name">
                          <strong>{c.fullName}</strong>
                          <small>{c.party}</small>
                          <div className="progress-track">
                            <span
                              style={{
                                background: c.color,
                                width: `${election.activeUnits ? (c.units / election.activeUnits) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="result-value">
                          <strong>{count(c.units)}</strong>
                          <small>units</small>
                        </div>
                      </div>
                    ))}
                    <p className="fine-print">
                      Totals reflect committed ballot events. A recall reduces support; it does not
                      transfer support to another candidate.
                    </p>
                  </div>
                )}
                {tab === 'My ballot' && (
                  <div className="panel ballot-panel">
                    <div className="ballot-icon">
                      <Fingerprint size={30} />
                    </div>
                    <h3>
                      {ballot ? 'You are in control of your support.' : 'Make your voice count.'}
                    </h3>
                    <p>
                      {ballot
                        ? `Your ballot supports ${election.candidates.find((c) => c.id === ballot.candidateId)?.fullName ?? 'your candidate'}.`
                        : 'Complete verification, sign the citizen agreement, then cast one ballot in each election.'}
                    </p>
                    <div className="balance">
                      <strong>{ballot?.balance ?? 100}</strong>
                      <span>{ballot ? 'remaining vote units' : 'units in your first ballot'}</span>
                    </div>
                    <div className="unit-steps">
                      {[1, 2, 3, 4].map((n) => (
                        <span
                          key={n}
                          className={(ballot?.balance ?? 100) >= n * 25 ? 'filled' : ''}
                        />
                      ))}
                    </div>
                    {ballot ? (
                      <>
                        <div className="recall-buttons">
                          <button
                            className="button secondary"
                            disabled={busy || !ready || !open || ballot.balance === 0 ||
                              election.recallPolicy?.enabled === false || election.recallPolicy?.partialEnabled === false ||
                              ballot.balance < (election.recallPolicy?.partialAmount ?? 25)}
                            onClick={() => recall('partial')}
                          >
                            <ArrowDownLeft size={16} /> Recall {election.recallPolicy?.partialAmount ?? 25} units
                          </button>
                          <button
                            className="button danger"
                            disabled={busy || !ready || !open || ballot.balance === 0 ||
                              election.recallPolicy?.enabled === false || election.recallPolicy?.fullEnabled === false}
                            onClick={() => recall('full')}
                          >
                            Recall all {ballot.balance} units
                          </button>
                        </div>
                        <p className="fine-print">
                          {election.recallPolicy?.enabled === false ? 'Recall is disabled for this election. ' :
                            `Recall rules: first delay ${election.recallPolicy?.firstDelaySeconds ?? 0}s; cooldown ${election.recallPolicy?.cooldownSeconds ?? 0}s; maximum ${election.recallPolicy?.maxOperations ?? 'unlimited'} operations. `}
                          A fully recalled ballot stays on the ledger. You cannot cast a second
                          ballot in this election.
                        </p>
                      </>
                    ) : (
                      <button
                        className="button primary"
                        onClick={() => (ready ? setTab('Candidates') : setOnboard(true))}
                      >
                        {ready ? 'Explore candidates' : 'Get ready to vote'}
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                )}
                {tab === 'Accountability' && (
                  <div className="accountability-cards">
                    {ranked.map((c) => (
                      <article className="panel" key={c.id}>
                        <button className="accountability-row" onClick={() => viewProfile(c)}>
                          <span
                            className="small-avatar"
                            style={{ color: c.color, background: `${c.color}18` }}
                          >
                            {initials(c.fullName)}
                          </span>
                          <span>
                            <strong>{c.fullName}</strong>
                            <small>{c.platform?.title ?? 'Platform coming soon'}</small>
                          </span>
                          <ChevronRight size={18} />
                        </button>
                        {c.platform && <PromiseTracker promises={c.platform.promises} />}
                      </article>
                    ))}
                  </div>
                )}
              </div>
              <aside className="right-column">
                <section className="panel live-panel">
                  <div className="panel-heading">
                    <h3>
                      <BarChart3 size={17} /> Election snapshot
                    </h3>
                    <span className="live-tag">{source === 'preview' ? 'SAMPLE' : 'LIVE'}</span>
                  </div>
                  <div className="donut">
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie
                          data={chart}
                          dataKey="value"
                          innerRadius={73}
                          outerRadius={88}
                          paddingAngle={3}
                          stroke="none"
                          isAnimationActive={false}
                        >
                          {chart.map((item, i) => (
                            <Cell key={i} fill={item.color} />
                          ))}
                        </Pie>
                        {!!election.activeUnits && (
                          <Tooltip
                            formatter={(value) => [`${count(Number(value))} units`, 'Support']}
                            contentStyle={{
                              background: 'var(--tooltip-bg)',
                              border: '1px solid var(--tooltip-border)',
                              borderRadius: 12,
                              color: 'var(--tooltip-color)',
                            }}
                          />
                        )}
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-label">
                      <strong>{count(election.activeUnits)}</strong>
                      <span>active vote units</span>
                    </div>
                  </div>
                  <div className="chart-legend">
                    {ranked.map((c) => (
                      <div key={c.id}>
                        <span className="legend-name">
                          <i style={{ background: c.color }} />
                          {c.fullName}
                        </span>
                        <strong>
                          {election.activeUnits
                            ? ((c.units / election.activeUnits) * 100).toFixed(1)
                            : '0.0'}
                          %
                        </strong>
                      </div>
                    ))}
                  </div>
                  <div className="snapshot-stats">
                    <div>
                      <Users size={15} />
                      <strong>{count(election.ballotCount)}</strong>
                      <span>ballots cast</span>
                    </div>
                    <div>
                      <ArrowDownLeft size={15} />
                      <strong>{count(election.recalledUnits)}</strong>
                      <span>units recalled</span>
                    </div>
                  </div>
                </section>
                <section className="panel journey-panel">
                  <div className="panel-heading">
                    <h3>
                      <ShieldCheck size={18} /> Ready to participate?
                    </h3>
                  </div>
                  <div className="journey-step">
                    <span className={citizen.connected ? 'done' : ''}>
                      {citizen.connected ? <Check size={13} /> : 1}
                    </span>
                    <div>
                      <strong>Connect your account</strong>
                      <small>Secure Telegram authentication</small>
                    </div>
                  </div>
                  <div className="journey-step">
                    <span className={citizen.verified ? 'done' : ''}>
                      {citizen.verified ? <Check size={13} /> : 2}
                    </span>
                    <div>
                      <strong>Verify your eligibility</strong>
                      <small>Mock provider · demo only</small>
                    </div>
                  </div>
                  <div className="journey-step">
                    <span className={citizen.agreementSigned ? 'done' : ''}>
                      {citizen.agreementSigned ? <Check size={13} /> : 3}
                    </span>
                    <div>
                      <strong>Sign the citizen agreement</strong>
                      <small>SHA-256 document commitment</small>
                    </div>
                  </div>
                  <button className="button primary full" onClick={() => setOnboard(true)}>
                    {ready ? 'View citizen status' : 'Get started'}
                    <ArrowRight size={16} />
                  </button>
                </section>
                <div className="privacy-note">
                  <LockKeyhole size={17} />
                  <p>
                    Public results show aggregate support. Your Telegram identity is never published
                    with a ballot.
                  </p>
                </div>
              </aside>
            </div>
            <footer className="main-footer">
              <span>
                <Layers3 size={13} /> Built for a more accountable tomorrow.
              </span>
              <button className="text-button" onClick={() => setAuditOpen(true)}>
                Inspect the public audit trail <ArrowUpRight size={13} />
              </button>
            </footer>
          </main>
        </div>
      </div>
      {notice && (
        <div
          className={`toast ${onboard || profile || confirmation || auditOpen ? 'modal-toast' : ''}`}
          role="status"
        >
          <span>{notice}</span>
          {retry && (
            <button disabled={busy} onClick={() => void execute(retry)}>
              Retry safely
            </button>
          )}
          <button aria-label="Dismiss notification" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
      {onboard && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="citizen-title"
          >
            <button
              className="close-modal"
              aria-label="Close"
              disabled={busy}
              onClick={() => setOnboard(false)}
            >
              <X size={20} />
            </button>
            <div className="modal-symbol">
              <ShieldCheck size={28} />
            </div>
            <div className="eyebrow">YOUR CITIZEN PASSPORT</div>
            <h2 id="citizen-title">A few steps. A lasting voice.</h2>
            <p className="modal-copy">
              This is a fictional MVP. Mock verification proves no real identity. The server
              operator can correlate your account and private ballot.
            </p>
            <div className="onboard-step">
              <h3>1. Connect your account {citizen.connected && <CheckCircle2 size={17} />}</h3>
              <p>Telegram signs the authentication data. Our server checks it.</p>
              {!citizen.connected && telegramLaunch === 'loading' && (
                <p role="status">Checking Telegram launch…</p>
              )}
              {!citizen.connected && telegramLaunch === 'outside' && (
                <p role="status">This page is outside Telegram. Open the Mini App from your bot to sign in.</p>
              )}
              {!citizen.connected && telegramLaunch === 'failed' && (
                <p role="alert">Telegram did not load. Reopen the Mini App from your bot.</p>
              )}
              {authFailure && <p role="alert">{authFailure}</p>}
              {!citizen.connected && (
                <div className="stack-buttons">
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() => void connect(false)}
                  >
                    Connect with Telegram <ArrowRight size={15} />
                  </button>
                  {demoEnabled && (
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => void connect(true)}
                    >
                      Start local demo account
                    </button>
                  )}
                </div>
              )}
              {citizen.connected && (
                <button className="button secondary" disabled={busy} onClick={() => void logout()}>
                  Sign out
                </button>
              )}
            </div>
            <div className="onboard-step">
              <h3>2. Mock voter verification {citizen.verified && <CheckCircle2 size={17} />}</h3>
              <p>A replaceable mock receipt, valid for 30 days.</p>
              <button
                className="button secondary"
                disabled={!citizen.connected || busy || citizen.verified}
                onClick={() =>
                  void execute({
                    path: 'verify',
                    payload: { consent: true },
                    success: 'Mock eligibility verified for 30 days.',
                  })
                }
              >
                {citizen.verified ? 'Mock verified' : 'I consent to mock verification'}
              </button>
            </div>
            <div className="onboard-step">
              <h3>3. Citizen agreement {citizen.agreementSigned && <CheckCircle2 size={17} />}</h3>
              {!citizen.agreementSigned && (
                <>
                  <button
                    className="text-button"
                    disabled={!citizen.verified || busy}
                    onClick={() => void reviewAgreement()}
                  >
                    Read citizen agreement v1 <ChevronRight size={14} />
                  </button>
                  {agreement && (
                    <div className="agreement-text">
                      <p>{agreement.text}</p>
                      <small>Document hash: {agreement.textHash}</small>
                      <label className="consent">
                        <input
                          type="checkbox"
                          checked={accepted}
                          onChange={(e) => setAccepted(e.target.checked)}
                        />{' '}
                        I have read and accept this agreement.
                      </label>
                      <button
                        className="button primary full"
                        disabled={!accepted || busy}
                        onClick={() =>
                          void execute({
                            path: 'agreement',
                            payload: { accepted: true, textHash: agreement.textHash },
                            success: 'Citizen agreement signed.',
                          })
                        }
                      >
                        Sign agreement <Fingerprint size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
              {citizen.agreementSigned && (
                <p>Version 1 signed with a private SHA-256 commitment.</p>
              )}
            </div>
            {ready && (
              <button className="button primary full" onClick={() => setOnboard(false)}>
                Explore the election <ArrowRight size={16} />
              </button>
            )}
          </section>
        </div>
      )}
      {currentProfile && (
        <div className="modal-backdrop">
          <section
            className="modal profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
          >
            <button
              className="close-modal"
              aria-label="Close profile"
              onClick={() => setProfile(null)}
            >
              <X size={20} />
            </button>
            <div
              className="avatar large"
              style={{ '--candidate-color': currentProfile.color } as React.CSSProperties}
            >
              {initials(currentProfile.fullName)}
            </div>
            <span
              className="ideology"
              style={{ '--candidate-color': currentProfile.color, color: currentProfile.color, background: `${currentProfile.color}15` } as React.CSSProperties}
            >
              {currentProfile.ideology}
            </span>
            <h2 id="profile-title">{currentProfile.fullName}</h2>
            <div className="party">
              <span style={{ background: currentProfile.color }} />
              {currentProfile.party}
            </div>
            <p className="modal-copy">{currentProfile.bio}</p>
            {currentProfile.platform && (
              <div className="platform-detail">
                <div className="eyebrow">PLATFORM · VERSION {currentProfile.platform.version}</div>
                <h3>{currentProfile.platform.title}</h3>
                <p>{currentProfile.platform.content}</p>
                <div className="platform-signatures">
                  <Fingerprint size={16} />
                  <strong>{count(currentProfile.platform.signatures)}</strong> digital endorsements
                </div>
                {currentProfile.platform.contentHash && (
                  <small className="document-hash">
                    SHA-256: {currentProfile.platform.contentHash}
                  </small>
                )}
                {citizen.signedPlatforms.includes(currentProfile.platform.id) ? (
                  <div className="signed-badge">
                    <CheckCircle2 size={16} /> You signed this platform
                  </div>
                ) : ready ? (
                  <>
                    <label className="consent">
                      <input
                        type="checkbox"
                        checked={platformConsent}
                        onChange={(e) => setPlatformConsent(e.target.checked)}
                      />{' '}
                      I have read and endorse this platform version.
                    </label>
                    <button
                      className="button secondary full"
                      disabled={busy || !platformConsent}
                      onClick={() =>
                        void execute({
                          path: 'platform/sign',
                          payload: {
                            platformId: currentProfile.platform!.id,
                            version: currentProfile.platform!.version,
                            textHash: currentProfile.platform!.contentHash,
                            accepted: true,
                          },
                          success: 'Platform endorsement recorded.',
                        })
                      }
                    >
                      Sign this platform <Fingerprint size={15} />
                    </button>
                  </>
                ) : (
                  <button
                    className="button secondary full"
                    onClick={() => {
                      setProfile(null);
                      setOnboard(true);
                    }}
                  >
                    Connect to endorse this platform
                  </button>
                )}
              </div>
            )}
            {currentProfile.platform && (
              <PromiseTracker promises={currentProfile.platform.promises} />
            )}
            <button
              className="button primary full"
              disabled={busy || !!ballot || !open}
              onClick={() => {
                cast(currentProfile);
                setProfile(null);
              }}
            >
              {ballot ? 'You already have a ballot' : 'Cast 100 units'}
              <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
      {confirmation && (
        <div className="modal-backdrop">
          <section
            className="modal confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div className="modal-symbol">
              {confirmation.path === 'vote' ? <VoteIcon size={28} /> : <ArrowDownLeft size={28} />}
            </div>
            <h2 id="confirm-title">
              {confirmation.path === 'vote'
                ? 'Cast your one ballot?'
                : confirmation.payload.mode === 'full'
                  ? `Recall all ${ballot?.balance ?? 0} units?`
                  : `Recall ${election.recallPolicy?.partialAmount ?? 25} units?`}
            </h2>
            <p className="modal-copy">
              {confirmation.path === 'vote'
                ? `Allocate 100 units to ${election.candidates.find((c) => c.id === confirmation.payload.candidateId)?.fullName}. You may recall support, but cannot cast a second ballot in this election.`
                : `This appends an immutable recall event. Recalled support cannot be reassigned. First recall delay: ${election.recallPolicy?.firstDelaySeconds ?? 0}s; cooldown: ${election.recallPolicy?.cooldownSeconds ?? 0}s; maximum operations: ${election.recallPolicy?.maxOperations ?? 'unlimited'}.`}
            </p>
            <div className="recall-buttons">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setConfirmation(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void execute(confirmation)}
              >
                {busy ? 'Recording…' : 'Confirm'}
                <Check size={15} />
              </button>
            </div>
          </section>
        </div>
      )}
      {auditOpen && <AuditExplorer onClose={() => setAuditOpen(false)} />}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button
          className={tab === 'Candidates' ? 'active' : ''}
          onClick={() => setTab('Candidates')}
        >
          <VoteIcon size={20} />
          Elections
        </button>
        <button
          className={tab === 'Live results' ? 'active' : ''}
          onClick={() => setTab('Live results')}
        >
          <BarChart3 size={20} />
          Results
        </button>
        <button className={tab === 'My ballot' ? 'active' : ''} onClick={() => setTab('My ballot')}>
          <WalletCards size={20} />
          My ballot
        </button>
        <button
          className={tab === 'Accountability' ? 'active' : ''}
          onClick={() => setTab('Accountability')}
        >
          <CheckCheck size={20} />
          Promises
        </button>
      </nav>
    </>
  );
}
