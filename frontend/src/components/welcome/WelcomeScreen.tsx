'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  FileText,
  Globe2,
  History,
  ListChecks,
  MessageCircle,
  MoreHorizontal,
  Send,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  openTelegramLink,
  telegramHaptic,
  useTelegram,
  useTelegramBackButton,
} from '@frontend/hooks/useTelegram';
import { nextWelcomeStep } from '@frontend/lib/welcome';
import { copy, type Language } from './copy';
import { useWelcomeFlow } from './useWelcomeFlow';
import { AgreementModal, InfoModal, VerificationModal } from './WelcomeModals';

type Modal = 'verification' | 'agreement' | 'about' | 'privacy' | 'exit' | null;
type Stage = 'launch' | 'mission' | 'connect';

const appBackground = '#F7F5F0';

const stageCopy = {
  en: {
    launchTitle: 'Your voice. Your choice.',
    launchDetail: 'Explore candidates. Make your choice.',
    motto: 'PEOPLE · VOICE · ACTION',
    start: 'Get started',
    missionKicker: 'WELCOME',
    missionTitle: 'Real people. Real influence.',
    missionIntro: 'See the people, ideas and progress behind each election.',
    missionSteps: [
      'Explore candidates',
      'Read their platforms',
      'See election results',
      'Track public promises',
      'Inspect the audit trail',
    ],
    missionDetails: [
      'Get to know each person before choosing',
      'Compare published proposals',
      'Follow aggregate support',
      'Review progress and evidence',
      'See recorded election actions',
    ],
    readyKicker: 'GETTING READY',
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
    feedback: 'Send feedback in Telegram',
    continue: 'Continue to verification',
    powered: 'Powered by',
    aboutDemo: 'Fictional election · mock verification',
    back: 'Back',
    passportTitle: 'Citizen Passport',
    passportDetail: 'Three steps to take part.',
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
    launchTitle: 'Ваш голос. Ваш вибір.',
    launchDetail: 'Знайомтеся з кандидатами. Зробіть вибір.',
    motto: 'ЛЮДИ · ГОЛОС · ДІЯ',
    start: 'Почати',
    missionKicker: 'ЛАСКАВО ПРОСИМО',
    missionTitle: 'Реальні люди. Реальний вплив.',
    missionIntro: 'Дізнайтеся про людей, ідеї та прогрес кожних виборів.',
    missionSteps: [
      'Знайомтеся з кандидатами',
      'Читайте їхні програми',
      'Дивіться результати виборів',
      'Стежте за обіцянками',
      'Переглядайте журнал дій',
    ],
    missionDetails: [
      'Дізнайтеся більше про кожного перед вибором',
      'Порівнюйте опубліковані пропозиції',
      'Стежте за загальною підтримкою',
      'Переглядайте прогрес і підтвердження',
      'Перевіряйте записані дії виборів',
    ],
    readyKicker: 'ПІДГОТОВКА',
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
    feedback: 'Надіслати відгук у Telegram',
    continue: 'Продовжити до перевірки',
    powered: 'За підтримки',
    aboutDemo: 'Вигадані вибори · демонстраційна перевірка',
    back: 'Назад',
    passportTitle: 'Паспорт громадянина',
    passportDetail: 'Три кроки до участі.',
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
  const [lang, setLang] = useState<Language>('en');
  const [stage, setStage] = useState<Stage>('launch');
  const [modal, setModal] = useState<Modal>(null);
  const lightStage = stage === 'launch' || stage === 'mission';
  const telegram = useTelegram(appBackground);
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
      else go(stage === 'connect' ? 'mission' : 'launch');
    },
  );

  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [lang]);

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
      router.push('/elections');
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
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onReady={telegram.onReady}
        onError={telegram.onError}
      />
      <div className="welcome-sheet fs-sheet" data-modal-background>
        <header className="welcome-header fs-header">
          <button
            className="welcome-close"
            type="button"
            onClick={
              stage === 'launch' ? closeApp : () => go(stage === 'mission' ? 'launch' : 'mission')
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
            <span className="sr-only">{t.language}</span>
            <select
              value={lang}
              aria-label={t.language}
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
            <span className="fs-logo-frame">
              <Image
                className="fs-original-logo"
                src="/brand/logo.jpg"
                alt="FreedomSword original sword and laurel emblem"
                width={1024}
                height={1024}
                sizes="(max-width: 480px) 60vw, 260px"
                loading="eager"
                fetchPriority="high"
                unoptimized
              />
            </span>
            <h1 id="fs-launch-title">{s.launchTitle}</h1>
            <p>{s.launchDetail}</p>
            <span className="fs-launch-motto">{s.motto}</span>
            <div className="fs-stage-bottom">
              <button type="button" className="fs-button fs-gold" onClick={() => go('mission')}>
                {s.start}
                <ArrowRight size={18} />
              </button>
              <small>{s.aboutDemo}</small>
            </div>
          </main>
        ) : stage === 'mission' ? (
          <main className="fs-stage fs-mission" aria-labelledby="fs-mission-title">
            <span className="fs-stage-kicker">{s.missionKicker}</span>
            <h1 id="fs-mission-title">{s.missionTitle}</h1>
            <p className="fs-stage-intro">{s.missionIntro}</p>
            <ul className="fs-mission-list">
              {[Users, FileText, BarChart3, ListChecks, History].map((Icon, index) => (
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
            </ul>
            <div className="fs-stage-bottom">
              <button type="button" className="fs-button" onClick={() => go('connect')}>
                {s.next}
                <ArrowRight size={18} />
              </button>
              <span className="fs-dots" aria-hidden="true">
                <i />
                <i className="active" />
                <i />
              </span>
            </div>
          </main>
        ) : (
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
            <a
              className="fs-feedback"
              href="https://t.me/freedomswordbot?start=feedback"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                if (openTelegramLink(event.currentTarget.href)) event.preventDefault();
              }}
            >
              <MessageCircle size={16} aria-hidden="true" />
              <span>{s.feedback}</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
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
                onClick={proceed}
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
