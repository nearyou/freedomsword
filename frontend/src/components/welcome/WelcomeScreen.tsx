'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Globe2,
  HeartHandshake,
  Landmark,
  MoreHorizontal,
  Send,
  ShieldCheck,
  Radio,
  Wallet,
  Vote,
} from 'lucide-react';
import {
  telegramHaptic,
  useTelegram,
  useTelegramBackButton,
} from '@frontend/hooks/useTelegram';
import { nextWelcomeStep } from '@frontend/lib/welcome';
import { copy, type Language } from './copy';
import { useWelcomeFlow } from './useWelcomeFlow';
import { AgreementModal, InfoModal, VerificationModal } from './WelcomeModals';
import FeedbackLink from '../FeedbackLink';
import { useLanguage } from '@frontend/hooks/useLanguage';
import ReadyToVote from './ReadyToVote';
import { inviteUrl } from '@frontend/lib/share';

type Modal = 'verification' | 'agreement' | 'about' | 'privacy' | 'exit' | null;
type Stage = 'launch' | 'mission' | 'connect' | 'share';

const stageCopy = {
  en: {
    launchTitle: 'Your voice.\nYour choice.',
    launchDetail: 'Take back control.',
    launchEmphasis: 'Manage your vote.',
    launchClosing: 'Shape what comes next.',
    launchFooter: 'A modern democracy for a stronger tomorrow.',
    changeLanguage: 'Change language',
    skip: 'Skip',
    telegramStart: 'Continue in Telegram',
    previewStart: 'Preview the demo',
    feedbackPending: 'Feedback bot coming soon',
    motto: 'PEOPLE · VOICE · ACTION',
    start: 'Get started',
    missionTitle: 'A new generation\nof democracy',
    missionSteps: [
      'Verified citizens',
      'Real-time updates',
      'Transparent and accountable',
    ],
    missionDetails: [
      'One person, one vote. Mock verification in this demo.',
      'Manage your vote over time.',
      'Candidate platforms, progress tracking and public audit records.',
    ],
    electionTypes: 'All types of elections',
    electionTypesDetail: 'Presidential, parliamentary, local and more',
    ukraineIssues: 'Issues that matter\nfor Ukraine',
    missionDemo: 'Fictional demo · identity and blockchain mocked; anonymity is not guaranteed.',
    readyKicker: 'Let’s get started',
    connectTitle: 'Connect to FreedomSword',
    connectDetail: 'Connect your Telegram account to continue. Wallet support is planned.',
    telegramAccount: 'Telegram account',
    telegramDetail: 'Use the account you opened this Mini App with.',
    connected: 'CONNECTED',
    demo: 'DEMO PREVIEW',
    waiting: 'CHECKING CONNECTION',
    walletTitle: 'Connect wallet',
    walletDetail: 'Telegram Wallet or another compatible option.',
    planned: 'INTEGRATION PLANNED',
    feedback: 'Tell us what you think',
    continue: 'Continue to verification',
    powered: 'Powered by',
    aboutDemo: 'Fictional election · mock verification',
    back: 'Back',
    passportTitle: 'Let’s get you ready',
    passportDetail: 'Three simple steps. We’ll walk you through them.',
    stepConnect: 'Connect Telegram',
    stepVerify: 'Verify your identity',
    stepAgreement: 'Accept civic agreement',
    stepConnectDetail: 'Your Mini App account',
    previewAccount: 'Browser preview; no Telegram account connected',
    stepVerifyDetail: 'Mock check · Rarimo planned',
    stepAgreementDetail: 'Participation rules',
    done: 'Complete',
    next: 'Continue',
    viewElections: 'Explore elections',
  },
  uk: {
    launchTitle: 'Ваш голос.\nВаш вибір.',
    launchDetail: 'Поверни собі вплив.',
    launchEmphasis: 'Керуй своїм голосом.',
    launchClosing: 'Формуй те, що буде далі.',
    launchFooter: 'Сучасна демократія заради сильнішого майбутнього.',
    changeLanguage: 'Змінити мову',
    skip: 'Пропустити',
    telegramStart: 'Продовжити в Telegram',
    previewStart: 'Переглянути демонстрацію',
    feedbackPending: 'Бот зворотного зв’язку — незабаром',
    motto: 'ЛЮДИ · ГОЛОС · ДІЯ',
    start: 'Почати',
    missionTitle: 'Нове покоління\nдемократії',
    missionSteps: [
      'Перевірені громадяни',
      'Оновлення в реальному часі',
      'Прозорість і підзвітність',
    ],
    missionDetails: [
      'Одна людина — один голос. У цьому демо перевірка імітується.',
      'Керуйте своїм голосом із часом.',
      'Програми кандидатів, відстеження поступу та відкриті записи аудиту.',
    ],
    electionTypes: 'Усі види виборів',
    electionTypesDetail: 'Президентські, парламентські, місцеві та інші',
    ukraineIssues: 'Питання, важливі\nдля України',
    missionDemo: 'Вигадане демо · перевірка особи й блокчейн імітуються; анонімність не гарантується.',
    readyKicker: 'Почнімо разом',
    connectTitle: 'Підключіться до FreedomSword',
    connectDetail: 'Підключіть Telegram, щоб продовжити. Підтримку гаманця заплановано.',
    telegramAccount: 'Обліковий запис Telegram',
    telegramDetail: 'Використовуйте обліковий запис, з якого відкрито міні застосунок.',
    connected: 'ПІДКЛЮЧЕНО',
    demo: 'ДЕМОНСТРАЦІЯ',
    waiting: 'ПЕРЕВІРКА З’ЄДНАННЯ',
    walletTitle: 'Підключіть гаманець',
    walletDetail: 'Telegram Wallet або інший сумісний варіант.',
    planned: 'ІНТЕГРАЦІЮ ЗАПЛАНОВАНО',
    feedback: 'Розкажіть, що ви думаєте',
    continue: 'Продовжити до перевірки',
    powered: 'За підтримки',
    aboutDemo: 'Вигадані вибори · демонстраційна перевірка',
    back: 'Назад',
    passportTitle: 'Підготуймося разом',
    passportDetail: 'Три прості кроки. Ми допоможемо на кожному.',
    stepConnect: 'Підключіть Telegram',
    stepVerify: 'Підтвердьте особу',
    stepAgreement: 'Прийміть громадянську угоду',
    stepConnectDetail: 'Ваш обліковий запис міні застосунку',
    previewAccount: 'Перегляд у браузері; Telegram не підключено',
    stepVerifyDetail: 'Демонстраційна перевірка · Rarimo заплановано',
    stepAgreementDetail: 'Правила участі',
    done: 'Виконано',
    next: 'Продовжити',
    viewElections: 'Переглянути вибори',
  },
} as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const [lang, setLang] = useLanguage();
  const [stage, setStage] = useState<Stage>('launch');
  const [modal, setModal] = useState<Modal>(null);
  // Both opening screens are light; connection and later screens use navy.
  const lightStage = stage === 'launch' || stage === 'mission';
  const light = lightStage && !modal;
  const telegram = useTelegram(light ? '#F6F3EC' : '#0A1722');
  const flow = useWelcomeFlow(telegram.launch);
  const t = copy[lang];
  const s = stageCopy[lang];
  const available = telegram.launch === 'ready' || telegram.launch === 'outside';
  const stepsDone = [telegram.launch === 'ready', flow.verified, flow.accepted].filter(Boolean).length;

  useTelegramBackButton(
    telegram.launch,
    !flow.busy && (!!modal || stage !== 'launch'),
    () => {
      if (modal) setModal(null);
      else go(stage === 'share' ? 'connect' : stage === 'connect' ? 'mission' : 'launch');
    },
  );

  useEffect(() => {
    const color = light ? '#F6F3EC' : '#0A1722';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }, [light]);

  function go(next: Stage) {
    setStage(next);
    telegramHaptic('impact');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function open(next: Modal) {
    if (!flow.busy) {
      flow.clearError();
      setModal(next);
    }
  }
  function proceed() {
    if (flow.busy) return;
    const next = nextWelcomeStep(flow.verified, flow.accepted);
    if (next === 'dashboard') {
      setModal(null);
      if (stage === 'share') router.push('/elections');
      else go('share');
    } else open(next);
  }
  function closeApp() {
    if (telegram.launch === 'ready' && window.Telegram?.WebApp.close)
      window.Telegram.WebApp.close();
    else open('exit');
  }

  return (
    <div
      className={`welcome-root fs-welcome ${lightStage ? 'fs-light' : 'fs-dark'}`}
      lang={lang}
      data-stage={stage}
      data-telegram={telegram.launch === 'ready'}
    >
      <div className="welcome-sheet fs-sheet" data-modal-background>
        <header className="welcome-header fs-header">
          <button
            className="welcome-close"
            type="button"
            onClick={
              stage === 'launch' ? closeApp : () => go(stage === 'share' ? 'connect' : stage === 'mission' ? 'launch' : 'mission')
            }
          >
            <ArrowLeft size={19} />
            <span>{stage === 'launch' ? t.close : s.back}</span>
          </button>
          <div className="welcome-header-title">
            <strong>FreedomSword</strong>
            <span>{t.miniApp}</span>
          </div>
          <button
            className="welcome-menu"
            type="button"
            aria-label={t.menu}
            onClick={() => open('about')}
          >
            <MoreHorizontal size={20} />
          </button>
        </header>
        <div className="welcome-language-row">
          <label className="welcome-language">
            <Globe2 size={17} aria-hidden="true" />
            <span className="sr-only">{s.changeLanguage}</span>
            <select
              value={lang}
              aria-label={s.changeLanguage}
              onChange={(event) => setLang(event.target.value as Language)}
            >
              <option value="en" lang="en">English</option>
              <option value="uk" lang="uk">Українська</option>
            </select>
            <ChevronDown size={13} aria-hidden="true" />
          </label>
        </div>
        {stage === 'launch' ? (
          <main className="fs-stage fs-launch" aria-labelledby="fs-launch-title">
            <Image
              className="fs-original-logo"
              src="/brand/emblem-reference.png"
              alt="FreedomSword sword, Ukrainian flag and laurel emblem"
              width={1157}
              height={1360}
              sizes="(max-width: 560px) 90vw, 460px"
              loading="eager"
              fetchPriority="high"
              unoptimized
            />
            <h1 id="fs-launch-title">{s.launchTitle}</h1>
            <div className="fs-launch-statement">
              <p>{s.launchDetail}</p>
              <p>{s.launchEmphasis}</p>
              <p>{s.launchClosing}</p>
            </div>
            <div className="fs-stage-bottom">
              {telegram.launch !== 'ready' ? <>
                <a className="fs-button" href={inviteUrl} target="_blank"
                  rel="noopener noreferrer"><Send size={20} />{s.telegramStart}</a>
              </> : <button type="button" className="fs-button" onClick={() => go('mission')}>
                <Send size={20} />{s.telegramStart}
              </button>}
              <small>{s.launchFooter}</small>
            </div>
          </main>
        ) : stage === 'mission' ? (
          <main className="fs-stage fs-mission" aria-labelledby="fs-mission-title">
            <button type="button" className="fs-mission-skip" onClick={() => go('connect')}>{s.skip}</button>
            <h1 id="fs-mission-title">{s.missionTitle}</h1>
            <ul className="fs-mission-list">
              {[ShieldCheck, Radio, Landmark].map((Icon, index) => (
                <li className="fs-mission-card" key={s.missionSteps[index]}>
                  <span className="fs-mission-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{s.missionSteps[index]}</strong>
                    <p>{s.missionDetails[index]}</p>
                  </div>
                </li>
              ))}
              <li className="fs-mission-card">
                <span className="fs-mission-icon"><Vote size={20} aria-hidden="true" /></span>
                <div><strong>{s.electionTypes}</strong><p>{s.electionTypesDetail}</p></div>
              </li>
              <li className="fs-mission-card">
                <span className="fs-mission-icon"><HeartHandshake size={20} aria-hidden="true" /></span>
                <div><strong className="fs-mission-issues">{s.ukraineIssues}</strong></div>
              </li>
            </ul>
            <div className="fs-stage-bottom">
              <button type="button" className="fs-mission-next" aria-label={s.next} onClick={() => go('connect')}>
                <ArrowRight size={28} aria-hidden="true" />
              </button>
              <span className="fs-dots" aria-hidden="true">
                <i />
                <i className="active" />
                <i />
              </span>
            </div>
            <p className="fs-mission-demo">{s.missionDemo}</p>
          </main>
        ) : stage === 'share' ? <ReadyToVote eligible={flow.verified && flow.accepted} onContinue={proceed} /> : (
          <main className="fs-stage fs-connect" aria-labelledby="fs-connect-title">
            <span className="fs-stage-kicker">
              {s.readyKicker} · {stepsDone} / 3
            </span>
            <span
              className="fs-progress"
              role="progressbar"
              aria-label={t.progress}
              aria-valuemin={0}
              aria-valuemax={3}
              aria-valuenow={stepsDone}
            >
              <span style={{ width: `${(stepsDone / 3) * 100}%` }} />
            </span>
            <h1 id="fs-connect-title">{s.passportTitle}</h1>
            <p className="fs-stage-intro">{s.passportDetail}</p>
            <div className="fs-passport-steps">
              <div className="fs-passport-step">
                <span className="fs-passport-number">1</span>
                <span className="fs-passport-icon"><Send size={20} aria-hidden="true" /></span>
                <span className="fs-passport-copy"><strong>{s.stepConnect}</strong><small>{telegram.launch === 'ready' ? s.stepConnectDetail : s.previewAccount}</small></span>
                {telegram.launch === 'ready' ? (
                  <span className="fs-passport-status"><Check size={16} aria-label={s.connected} /></span>
                ) : (
                  <span className="fs-passport-preview">{s.demo}</span>
                )}
              </div>
              <button className="fs-passport-step" type="button" onClick={() => open('verification')} disabled={!available}>
                <span className="fs-passport-number">2</span>
                <span className="fs-passport-icon"><ShieldCheck size={20} aria-hidden="true" /></span>
                <span className="fs-passport-copy"><strong>{s.stepVerify}</strong><small>{s.stepVerifyDetail}</small></span>
                {flow.verified ? <span className="fs-passport-status"><Check size={16} aria-label={s.done} /></span> : <ArrowRight className="fs-passport-arrow" size={17} aria-hidden="true" />}
              </button>
              <button className="fs-passport-step" type="button" onClick={() => open('agreement')} disabled={!available}>
                <span className="fs-passport-number">3</span>
                <span className="fs-passport-icon"><FileText size={20} aria-hidden="true" /></span>
                <span className="fs-passport-copy"><strong>{s.stepAgreement}</strong><small>{s.stepAgreementDetail}</small></span>
                {flow.accepted ? <span className="fs-passport-status"><Check size={16} aria-label={s.done} /></span> : <ArrowRight className="fs-passport-arrow" size={17} aria-hidden="true" />}
              </button>
            </div>
            <div className="fs-passport-step fs-passport-wallet">
              <span className="fs-passport-icon"><Wallet size={20} aria-hidden="true" /></span>
              <span className="fs-passport-copy"><strong>{s.walletTitle}</strong><small>{s.walletDetail}</small></span>
              <span className="fs-passport-preview">{s.planned}</span>
            </div>
            <FeedbackLink className="fs-feedback" label={s.feedback}
              unavailableLabel={s.feedbackPending} />
            <button type="button" className="button secondary" onClick={() => go('share')}>
              {lang === 'uk' ? 'Запросити друзів' : 'Invite friends'}
            </button>
            {telegram.launch === 'failed' && (
              <p className="civic-field-error" role="alert">
                {t.failed}
              </p>
            )}
            {flow.error && (
              <p className="civic-field-error" role="alert">
                {flow.error}
              </p>
            )}
            <div className="fs-stage-bottom">
              <button
                type="button"
                className="fs-button"
                onClick={() => go('share')}
                disabled={flow.busy || !available}
              >
                {flow.verified && flow.accepted ? s.viewElections : s.next}
                <ArrowRight size={18} />
              </button>
              <small>
                {s.powered}{' '}
                <a href="https://freedomtool.org/" target="_blank" rel="noopener noreferrer">
                  FreedomTool
                </a>{' '}
                · {s.aboutDemo}
              </small>
            </div>
          </main>
        )}
      </div>
      {modal === 'verification' && (
        <VerificationModal
          t={t}
          onClose={() => setModal(null)}
          busy={flow.busy}
          error={flow.error}
          preview={flow.preview}
          verified={flow.verified}
          available={available}
          onVerify={async () => {
            const completed = await flow.perform('verify');
            telegramHaptic(completed ? 'success' : 'error');
            return completed;
          }}
          onAgreement={() => open('agreement')}
        />
      )}
      {modal === 'agreement' && (
        <AgreementModal
          t={t}
          lang={lang}
          onClose={() => setModal(null)}
          busy={flow.busy}
          error={flow.error}
          preview={flow.preview}
          verified={flow.verified}
          accepted={flow.accepted}
          onAccept={async (document) => {
            const completed = await flow.perform('agreement', document);
            telegramHaptic(completed ? 'success' : 'error');
            return completed;
          }}
          onVerify={() => open('verification')}
          onContinue={proceed}
        />
      )}
      {(modal === 'about' || modal === 'privacy' || modal === 'exit') && (
        <InfoModal
          t={t}
          kind={modal}
          onPreview={telegram.launch === 'ready' ? undefined : () => { setModal(null); go('mission'); }}
          onClose={() => setModal(null)}
          onWelcome={() => {
            setModal(null);
            go('launch');
          }}
        />
      )}
    </div>
  );
}
