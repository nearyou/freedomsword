'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Layers3,
  RefreshCw,
  X,
} from 'lucide-react';
import type { CandidateView } from '@frontend/lib/contracts';
import type { AppTab } from '@frontend/lib/ui';
import { useCitizen } from '@frontend/hooks/useCitizen';
import { useElections } from '@frontend/hooks/useElections';
import { telegramHaptic, useTelegram, useTelegramBackButton } from '@frontend/hooks/useTelegram';
import { useVoting, type Action } from '@frontend/hooks/useVoting';
import AppShell from './layout/AppShell';
import ElectionSelector, { ElectionGallery } from './elections/ElectionSelector';
import CommunityWelcome from './elections/CommunityWelcome';
import CandidateList from './candidates/CandidateList';
import CandidateProfile from './candidates/CandidateProfile';
import CitizenPassport from './onboarding/CitizenPassport';
import VoteConfirmation from './voting/VoteConfirmation';
import VoteSuccess from './voting/VoteSuccess';
import Dialog from './ui/Dialog';
import BallotPanel from './voting/BallotPanel';
import ResultsPanel from './results/ResultsPanel';
import AccountabilityPanel from './accountability/AccountabilityPanel';
import LoadingCards from './ui/LoadingCards';
import AuditExplorer from './AuditExplorer';
import { useLanguage } from '@frontend/hooks/useLanguage';
import { navigation } from './layout/navigation';
type Modal =
  | { type: 'passport' }
  | { type: 'profile'; id: string }
  | { type: 'confirm'; action: Action }
  | { type: 'audit' }
  | { type: 'vote-success'; name: string }
  | null;
const headings: Record<AppTab, string> = {
  Candidates: 'Elections',
  'Live results': 'Results',
  'My ballot': 'Your support',
  Accountability: 'Promises',
};
const descriptions: Record<AppTab, string> = {
  Candidates: 'Meet the people and ideas shaping our shared future.',
  'Live results': 'See how our choices come together.',
  'My ballot': 'Choose what feels right for you. You can change your mind.',
  Accountability: 'Let’s see how those promises are coming along.',
};
export default function FreedomSwordApp({ demoEnabled, initialTab = 'Candidates', initialElectionId }: {
  demoEnabled: boolean;
  initialTab?: AppTab;
  initialElectionId?: string;
}) {
  const [language] = useLanguage();
  const uk = language === 'uk';
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
  const [activeId, setActiveId] = useState(initialElectionId ?? 'reusable-support-demo');
  const [supportCandidateId, setSupportCandidateId] = useState<string>();
  const [tab, setTab] = useState<AppTab>(initialTab);
  const heading = uk ? navigation.find((item) => item.value === tab)!.labelUk : headings[tab];
  const detail = uk ? {
    Candidates: 'Знайомтеся з людьми та ідеями, що формують наше спільне майбутнє.',
    'Live results': 'Дивіться, як поєднуються наші рішення.',
    'My ballot': 'Оберіть те, що підходить вам. Ви можете змінити думку.',
    Accountability: 'Погляньмо, як виконуються ці обіцянки.',
  }[tab] : descriptions[tab];
  const [showElectionList, setShowElectionList] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('support');
  const [modal, setModal] = useState<Modal>(null);
  const [now, setNow] = useState(0);
  useTelegramBackButton(telegram.launch, !actions.busy && (!!modal || tab !== 'Candidates' || !showElectionList), () => {
    if (modal) setModal(null);
    else if (tab === 'Candidates') setShowElectionList(true);
    else { setTab('Candidates'); setShowElectionList(true); }
  });
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
    if (election.protocol === 'MACI_PRIVATE' || election.protocol === 'CONTINUOUS_SUPPORT') {
      setSupportCandidateId(candidate.id);
      close();
      setTab('My ballot');
      window.scrollTo(0, 0);
      return;
    }
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
  function recall(mode: 'partial' | 'full', units?: number) {
    setModal({
      type: 'confirm',
      action: {
        path: 'recall',
        payload: { electionId: election.id, mode, ...(units === undefined ? {} : { units }), requestId: crypto.randomUUID() },
        success:
          mode === 'partial'
            ? `${units ?? election.recallPolicy?.partialAmount ?? 25} units recalled. Your support balance has been updated.`
            : 'All remaining support recalled. Your initial ballot remains recorded.',
      },
    });
  }
  async function confirm(action: Action) {
    const completed = await actions.execute(action);
    telegramHaptic(completed ? 'success' : 'error');
    if (completed) {
      close();
      if (action.path === 'vote') {
        setModal({ type: 'vote-success', name: election.candidates.find((item) => item.id === action.payload.candidateId)?.fullName ?? 'Candidate' });
        setTab('My ballot');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }
  const stale = source === 'database' && !!electionState.error;
  const refreshError = (source === 'database' && electionState.error) || citizenState.error;
  return (
    <>
      <AppShell
        tab={tab}
        onTab={(value) => {
          if (value !== tab) telegramHaptic('selection');
          setTab(value);
          if (value === 'Candidates') setShowElectionList(true);
          window.scrollTo(0, 0);
        }}
        citizen={citizen}
        onPassport={openPassport}
        inTelegram={telegram.launch === 'ready'}
      >
        <div className="elections-page-heading">
          <div>
            <span className="page-kicker">{uk ? 'Ваша спільнота, ваш голос' : 'Your community, your voice'}</span>
            {tab === 'Candidates' && !showElectionList && (
              <button className="elections-back" type="button" onClick={() => setShowElectionList(true)}>
                <ArrowLeft size={16} aria-hidden="true" /> {uk ? 'Усі вибори' : 'All elections'}
              </button>
            )}
            <h1>{tab === 'Candidates' && !showElectionList ? election?.title : heading}</h1>
            <p>{tab === 'Candidates' && !showElectionList
              ? uk ? 'Познайомтеся з кандидатами та знайдіть ідеї, у які вірите.' : 'Get to know the candidates and find the ideas you believe in.' : detail}</p>
          </div>
          <span className={`network-status ${stale ? 'interrupted' : ''}`}>
            <span className="mini-dot" />
            {source === 'preview' ? uk ? 'Зразок' : 'Sample' : stale ? uk ? 'Оновлення призупинено' : 'Refresh paused' : uk ? 'Оновлюється наживо' : 'Updated live'}
          </span>
        </div>
        <p className="elections-demo-note">
          {election?.protocol === 'MACI_PRIVATE' && election.privatePoll?.registrationMode === 'RARIMO'
            ? <><strong>Private poll</strong> Fictional election · Rarimo eligibility on chain 7368</>
            : <><strong>{uk ? 'Демо простір' : 'Demo space'}</strong> {uk ? 'Вигадані вибори · імітація перевірки особи та блокчейну' : 'Fictional elections · mock identity and blockchain'}</>}
        </p>
        {tab === 'Candidates' && showElectionList && <CommunityWelcome />}
        {refreshError && (
          <div className="refresh-banner" role="status">
            <div>
              <strong>Refresh interrupted</strong>
              <p>{refreshError}</p>
              {source === 'database' && electionState.error && citizenState.error && (
                <p>{citizenState.error}</p>
              )}
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
            {tab === 'Candidates' && showElectionList ? (
              <ElectionGallery
                elections={elections}
                onSelect={(id) => {
                  setActiveId(id);
                  setShowElectionList(false);
                  setQuery('');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : tab !== 'Candidates' ? (
              <ElectionSelector
                elections={elections}
                selected={election.id}
                onSelect={(id) => {
                  setActiveId(id);
                  setQuery('');
                }}
              />
            ) : null}
            <div className="elections-content" aria-label={heading}>
              {tab === 'Candidates' && !showElectionList && (
                <CandidateList
                  election={election}
                  query={query}
                  onQuery={setQuery}
                  sort={sort}
                  onSort={setSort}
                  onProfile={(candidate) => setModal({ type: 'profile', id: candidate.id })}
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
                    citizen={citizen}
                    onRefresh={() => refresh(true)}
                    ready={ready}
                    busy={actions.busy}
                    privateError={!!citizenState.error}
                    now={now}
                    onRecall={recall}
                    initialCandidateId={supportCandidateId}
                    onExplore={() => { setTab('Candidates'); setShowElectionList(false); }}
                    onElections={() => { setTab('Candidates'); setShowElectionList(true); window.scrollTo(0, 0); }}
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
          <button className="text-button" onClick={() => setModal({ type: 'audit' })}>
            {uk ? 'Переглянути відкритий журнал аудиту' : 'Inspect public audit trail'} <ArrowUpRight size={14} />
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
      {modal?.type === 'vote-success' && <Dialog titleId="vote-success-title" onClose={close} className="vote-success-modal">
        <VoteSuccess name={modal.name} units={100} reusable={false} onBallot={close}
          onExplore={() => { close(); setTab('Candidates'); setShowElectionList(true); }} />
      </Dialog>}
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
