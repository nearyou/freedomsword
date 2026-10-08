'use client';
import { useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Layers3,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { CandidateView } from '@/lib/contracts';
import { electionOpen, type AppTab } from '@/lib/ui';
import { useCitizen } from '@/hooks/useCitizen';
import { useElections } from '@/hooks/useElections';
import { useTelegram } from '@/hooks/useTelegram';
import { useVoting, type Action } from '@/hooks/useVoting';
import AppShell from './layout/AppShell';
import ElectionSelector, { ElectionDetail } from './elections/ElectionSelector';
import CandidateList from './candidates/CandidateList';
import CandidateProfile from './candidates/CandidateProfile';
import CitizenPassport from './onboarding/CitizenPassport';
import VoteConfirmation from './voting/VoteConfirmation';
import BallotPanel from './voting/BallotPanel';
import ResultsPanel from './results/ResultsPanel';
import ElectionSnapshot from './results/ElectionSnapshot';
import AccountabilityPanel from './accountability/AccountabilityPanel';
import LoadingCards from './ui/LoadingCards';
import AuditExplorer from './AuditExplorer';
type Modal =
  | { type: 'passport' }
  | { type: 'profile'; id: string }
  | { type: 'confirm'; action: Action }
  | { type: 'audit' }
  | null;
const headings: Record<AppTab, [string, string]> = {
  Candidates: ['Meet your candidates', 'People, platforms, and the future they stand for.'],
  'Live results': ['Every unit counts', 'Follow participation, recalls, and active support.'],
  'My ballot': [
    'Your support, your control',
    'One initial ballot. Accountability throughout the election.',
  ],
  Accountability: [
    'Promises into progress',
    'Explore reported milestones and the evidence behind them.',
  ],
};
export default function DemocracyApp({ demoEnabled }: { demoEnabled: boolean }) {
  const citizenState = useCitizen();
  const electionState = useElections();
  const telegram = useTelegram();
  const refreshCitizen = citizenState.refresh;
  const refreshElections = electionState.refresh;
  const refresh = useCallback(
    async (force = false) => {
      await Promise.all([refreshCitizen(force), refreshElections(force)]);
    },
    [refreshCitizen, refreshElections],
  );
  const actions = useVoting(() => refresh(true));
  const [activeId, setActiveId] = useState('council-2026');
  const [tab, setTab] = useState<AppTab>('Candidates');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('support');
  const [modal, setModal] = useState<Modal>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const initial = setTimeout(() => {
      setNow(Date.now());
      void refresh();
    }, 0);
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 8000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      clearInterval(clock);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);
  const { citizen } = citizenState;
  const { elections, source } = electionState;
  const election = elections.find((item) => item.id === activeId) ?? elections[0];
  const ballot = citizen.votes.find((item) => item.electionId === election?.id);
  const ready =
    citizen.connected && citizen.verified && citizen.agreementSigned && source === 'database';
  const profile =
    modal?.type === 'profile'
      ? election?.candidates.find((candidate) => candidate.id === modal.id)
      : undefined;
  const openPassport = () => setModal({ type: 'passport' });
  const close = () => setModal(null);
  async function connect(demo: boolean) {
    const initData = window.Telegram?.WebApp.initData;
    if (!demo && !initData) {
      actions.reportError('Open this Mini App from your Telegram bot to connect.');
      return;
    }
    await actions.execute({
      path: 'auth',
      payload: demo ? { demo: true } : { initData },
      success: demo ? 'Local demo account connected.' : 'Telegram account connected.',
    });
  }
  async function logout() {
    if (await actions.execute({ path: 'logout', payload: {}, success: 'Signed out.' })) {
      citizenState.clear();
      close();
    }
  }
  function cast(candidate: CandidateView) {
    if (!ready) {
      openPassport();
      return;
    }
    if (citizenState.error) {
      actions.reportError('Refresh your private ballot state before casting.');
      return;
    }
    setModal({
      type: 'confirm',
      action: {
        path: 'vote',
        payload: {
          electionId: election.id,
          candidateId: candidate.id,
          requestId: crypto.randomUUID(),
        },
        success: `Vote recorded. 100 units allocated to ${candidate.fullName}.`,
      },
    });
  }
  function recall(mode: 'partial' | 'full') {
    setModal({
      type: 'confirm',
      action: {
        path: 'recall',
        payload: { electionId: election.id, mode, requestId: crypto.randomUUID() },
        success:
          mode === 'partial'
            ? `${election.recallPolicy?.partialAmount ?? 25} units recalled. Your support balance has been updated.`
            : 'All remaining support recalled. Your initial ballot remains recorded.',
      },
    });
  }
  async function confirm(action: Action) {
    if (await actions.execute(action)) close();
  }
  const stale = !!electionState.error;
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onReady={telegram.onReady}
        onError={telegram.onError}
      />
      <AppShell tab={tab} onTab={setTab} citizen={citizen} onPassport={openPassport}>
        <div className="intro">
          <div>
            <p className="eyebrow">
              <Sparkles size={13} />
              DEMOCRACY, IN MOTION
            </p>
            <h1>
              Your voice.
              <br className="mobile-break" /> <span>Your choice.</span>
            </h1>
            <p>
              Vote with confidence. Recall with freedom.
              <br />
              Shape what comes next.
            </p>
          </div>
          <span className={`network-status ${stale ? 'interrupted' : ''}`}>
            <span className="mini-dot" />
            {source === 'preview'
              ? 'Sample preview'
              : stale
                ? 'Refresh interrupted'
                : 'Live · updates every 8s'}
          </span>
        </div>
        <div className="demo-note">
          <CircleHelp size={18} />
          <div>
            <strong>Fictional elections for demonstration.</strong>
            <span>
              {source === 'preview'
                ? 'Synthetic preview totals. Participation requires the database.'
                : 'Mock eligibility and blockchain · results from the database.'}
            </span>
          </div>
          <button aria-label="Learn about this demonstration" onClick={openPassport}>
            <ArrowUpRight size={18} />
          </button>
        </div>
        {(electionState.error || citizenState.error) && (
          <div className="refresh-banner" role="status">
            <div>
              <strong>Refresh interrupted</strong>
              <p>{electionState.error || citizenState.error}</p>
              {electionState.error && citizenState.error && <p>{citizenState.error}</p>}
            </div>
            <button className="button secondary" onClick={() => void refresh()}>
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        )}
        {electionState.loading ? (
          <LoadingCards />
        ) : election ? (
          <>
            <ElectionSelector
              elections={elections}
              selected={election.id}
              onSelect={(id) => {
                setActiveId(id);
                setQuery('');
              }}
            />
            <ElectionDetail election={election} />
            <div className="content-grid">
              <div className="primary-content">
                <div className="section-heading">
                  <div>
                    <h2>{headings[tab][0]}</h2>
                    <p>{headings[tab][1]}</p>
                  </div>
                  <span
                    className={`open-badge ${electionOpen(election, now || undefined) ? '' : 'closed'}`}
                  >
                    {electionOpen(election, now || undefined) ? 'Voting open' : 'Voting closed'}
                  </span>
                </div>
                <div className="tabs" role="tablist" aria-label="Election views">
                  {(['Candidates', 'Live results', 'My ballot', 'Accountability'] as AppTab[]).map(
                    (value) => (
                      <button
                        key={value}
                        id={`election-tab-${value.replaceAll(' ', '-')}`}
                        role="tab"
                        aria-selected={tab === value}
                        aria-controls="election-tab-panel"
                        className={tab === value ? 'selected' : ''}
                        onClick={() => setTab(value)}
                      >
                        {value === 'Accountability' ? 'Promises' : value}
                      </button>
                    ),
                  )}
                </div>
                <div
                  id="election-tab-panel"
                  role="tabpanel"
                  aria-labelledby={`election-tab-${tab.replaceAll(' ', '-')}`}
                >
                  {tab === 'Candidates' && (
                    <CandidateList
                      election={election}
                      ballot={ballot}
                      busy={actions.busy}
                      query={query}
                      onQuery={setQuery}
                      sort={sort}
                      onSort={setSort}
                      onProfile={(candidate) => setModal({ type: 'profile', id: candidate.id })}
                      onCast={cast}
                    />
                  )}
                  {tab === 'Live results' && (
                    <ResultsPanel election={election} source={source} stale={stale} />
                  )}
                  {tab === 'My ballot' &&
                    (citizenState.loading ? (
                      <LoadingCards label="Loading your private ballot" />
                    ) : (
                      <BallotPanel
                        election={election}
                        ballot={ballot}
                        ready={ready}
                        busy={actions.busy}
                        privateError={!!citizenState.error}
                        now={now}
                        onRecall={recall}
                        onExplore={() => setTab('Candidates')}
                        onPassport={openPassport}
                      />
                    ))}
                  {tab === 'Accountability' && (
                    <AccountabilityPanel
                      candidates={election.candidates}
                      onProfile={(candidate) => setModal({ type: 'profile', id: candidate.id })}
                    />
                  )}
                </div>
              </div>
              <aside className="right-column">
                {tab !== 'Live results' && (
                  <ElectionSnapshot election={election} source={source} stale={stale} />
                )}
                <section className="panel journey-panel">
                  <div className="panel-heading">
                    <h3>
                      <ShieldCheck size={19} />
                      Citizen Passport
                    </h3>
                  </div>
                  {[
                    ['Connect Telegram', citizen.connected],
                    ['Verify eligibility · MOCK', citizen.verified],
                    ['Accept citizen agreement', citizen.agreementSigned],
                  ].map(([label, done], index) => (
                    <div className="journey-step" key={String(label)}>
                      <span className={done ? 'done' : ''}>
                        {done ? <Check size={14} /> : index + 1}
                      </span>
                      <strong>{label}</strong>
                    </div>
                  ))}
                  <button className="button primary full" onClick={openPassport}>
                    {ready ? 'View citizen status' : 'Get started'}
                    <ArrowRight size={16} />
                  </button>
                </section>
                <div className="privacy-note">
                  <LockKeyhole size={18} />
                  <p>
                    Public results show aggregate support. Your Telegram identity is never published
                    with a ballot.
                  </p>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <div className="panel empty-state">
            <Layers3 size={30} />
            <h2>No public elections yet</h2>
            <p>Published elections will appear here when available.</p>
            <button className="button secondary" onClick={() => void refresh()}>
              Refresh elections
            </button>
          </div>
        )}
        <footer className="main-footer">
          <span>
            <Layers3 size={14} />
            Accountability, throughout the election.
          </span>
          <button className="text-button" onClick={() => setModal({ type: 'audit' })}>
            Inspect public audit trail <ArrowUpRight size={14} />
          </button>
        </footer>
      </AppShell>
      {modal?.type === 'passport' && (
        <CitizenPassport
          citizen={citizen}
          busy={actions.busy}
          ready={ready}
          demoEnabled={demoEnabled}
          launch={telegram.launch}
          onClose={close}
          onConnect={connect}
          onLogout={logout}
          onAction={actions.execute}
        />
      )}
      {profile && election && (
        <CandidateProfile
          key={profile.id}
          candidate={profile}
          election={election}
          citizen={citizen}
          ballot={ballot}
          ready={ready && !citizenState.error}
          busy={actions.busy}
          onClose={close}
          onCast={cast}
          onPassport={openPassport}
          onAction={actions.execute}
        />
      )}
      {modal?.type === 'confirm' && election && (
        <VoteConfirmation
          action={modal.action}
          candidate={election.candidates.find(
            (candidate) =>
              candidate.id ===
              (modal.action.path === 'vote'
                ? modal.action.payload.candidateId
                : ballot?.candidateId),
          )}
          election={election}
          ballot={ballot}
          busy={actions.busy}
          onCancel={close}
          onConfirm={() => void confirm(modal.action)}
        />
      )}
      {modal?.type === 'audit' && <AuditExplorer onClose={close} />}
      {actions.notice && (
        <div
          className={`toast ${modal ? 'modal-toast' : ''} ${actions.notice.success ? 'success-toast' : 'error-toast'}`}
          role={actions.notice.success ? 'status' : 'alert'}
        >
          {actions.notice.success && <CheckCircle2 size={19} />}
          <span>{actions.notice.message}</span>
          {actions.retry && (
            <button
              disabled={actions.busy}
              onClick={() => actions.retry && void confirm(actions.retry)}
            >
              Retry safely
            </button>
          )}
          <button aria-label="Dismiss notification" onClick={actions.dismiss}>
            <X size={17} />
          </button>
        </div>
      )}
    </>
  );
}
