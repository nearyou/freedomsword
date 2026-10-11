'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  FileText,
  Globe2,
  MessageCircle,
  MoreHorizontal,
  Send,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { nextWelcomeStep } from '@/lib/welcome';
import { copy, type Language } from './copy';
import { useWelcomeFlow } from './useWelcomeFlow';
import { AgreementModal, InfoModal, VerificationModal } from './WelcomeModals';
import ElectionLobby from './ElectionLobby';

type Modal = 'verification' | 'agreement' | 'about' | 'privacy' | 'exit' | null;
type Stage = 'launch' | 'mission' | 'connect';

const stageCopy = {
  en: {
    launchTitle: 'Your voice. Your choice.',
    launchDetail: 'A place to explore candidates and make your choice.',
    launchMotto: 'PEOPLE · VOICE · ACTION',
    start: 'Get started',
    missionTitle: 'Real people. Real influence.',
    missionDetail:
      'Your voice builds a stronger future. See the people, ideas and progress behind each election.',
    missionSteps: [
      ['A clear path to participation', 'Learn how the demonstration works.'],
      ['Explore candidates', 'Compare plans before choosing.'],
      ['Track progress', 'Follow published promises.'],
    ],
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
  },
  uk: {
    launchTitle: 'Ваш голос. Ваш вибір.',
    launchDetail: 'Місце, де можна ознайомитися з кандидатами та зробити вибір.',
    launchMotto: 'ЛЮДИ · ГОЛОС · ДІЯ',
    start: 'Почати',
    missionTitle: 'Справжні люди. Справжній вплив.',
    missionDetail:
      'Ваш голос творить сильніше майбутнє. Дізнавайтеся про людей, ідеї та поступ у кожних виборах.',
    missionSteps: [
      ['Зрозумілий шлях до участі', 'Дізнайтеся, як працює демонстрація.'],
      ['Знайомтеся з кандидатами', 'Порівнюйте плани перед вибором.'],
      ['Стежте за поступом', 'Читайте опубліковані обіцянки.'],
    ],
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
  },
} as const;

export default function WelcomeScreen() {
  const [lang, setLang] = useState<Language>('en');
  const [stage, setStage] = useState<Stage>('launch');
  const [modal, setModal] = useState<Modal>(null);
  const [dashboard, setDashboard] = useState(false);
  const telegram = useTelegram();
  const flow = useWelcomeFlow(telegram.launch);
  const t = copy[lang];
  const s = stageCopy[lang];
  const available = telegram.launch === 'ready' || telegram.launch === 'outside';
  const light = !dashboard && (stage === 'launch' || stage === 'mission') && !modal;

  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [lang]);

  useEffect(() => {
    const color = light ? '#F8F3E8' : '#071522';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
    if (telegram.launch === 'ready') {
      const webapp = window.Telegram?.WebApp;
      if (webapp?.isVersionAtLeast('6.1')) {
        webapp.setHeaderColor(color);
        webapp.setBackgroundColor(color);
      }
    }
  }, [light, telegram.launch]);

  useEffect(() => {
    if (dashboard) document.getElementById('civic-lobby-title')?.focus();
  }, [dashboard]);

  function go(next: Stage) {
    setStage(next);
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
      setDashboard(true);
      window.scrollTo(0, 0);
    } else open(next);
  }
  function closeApp() {
    if (telegram.launch === 'ready' && window.Telegram?.WebApp.close)
      window.Telegram.WebApp.close();
    else open('exit');
  }

  return (
    <div
      className={`welcome-root fs-welcome ${light ? 'fs-light' : 'fs-dark'}`}
      lang={lang}
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
              <option value="en">EN</option>
              <option value="uk">UK</option>
            </select>
            <ChevronDown size={13} aria-hidden="true" />
          </label>
        </div>
        {dashboard ? (
          <ElectionLobby
            t={t}
            preview={flow.preview}
            onBack={() => {
              setDashboard(false);
              go('connect');
            }}
          />
        ) : stage === 'launch' ? (
          <main className="fs-stage fs-launch" aria-labelledby="fs-launch-title">
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
            <h1 id="fs-launch-title">{s.launchTitle}</h1>
            <p>{s.launchDetail}</p>
            <span className="fs-launch-motto">{s.launchMotto}</span>
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
            <span className="fs-stage-kicker">WELCOME · 01 / 02</span>
            <h1 id="fs-mission-title">{s.missionTitle}</h1>
            <p className="fs-stage-intro">{s.missionDetail}</p>
            <div className="fs-mission-list">
              {[Users, FileText, ShieldCheck].map((Icon, index) => (
                <div className="fs-mission-card" key={s.missionSteps[index][0]}>
                  <span className="fs-mission-icon">
                    <Icon size={21} />
                  </span>
                  <div>
                    <strong>{s.missionSteps[index][0]}</strong>
                    <p>{s.missionSteps[index][1]}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="fs-stage-bottom">
              <button type="button" className="fs-button" onClick={() => go('connect')}>
                {t.continueReady}
                <ArrowRight size={18} />
              </button>
              <span className="fs-dots">
                <i className="active" />
                <i />
                <i />
              </span>
            </div>
          </main>
        ) : (
          <main className="fs-stage fs-connect" aria-labelledby="fs-connect-title">
            <span className="fs-stage-kicker">GETTING READY · 01 / 03</span>
            <div className="fs-progress">
              <span />
            </div>
            <h1 id="fs-connect-title">{s.connectTitle}</h1>
            <p className="fs-stage-intro">{s.connectDetail}</p>
            <div className="fs-connect-card">
              <span className="fs-connect-icon telegram">
                <Send size={22} />
              </span>
              <div>
                <strong>{s.telegramAccount}</strong>
                <p>{s.telegramDetail}</p>
                <span className="fs-chip success">
                  {telegram.launch === 'ready'
                    ? s.connected
                    : telegram.launch === 'outside'
                      ? s.demo
                      : s.waiting}
                </span>
              </div>
            </div>
            <div className="fs-connect-card">
              <span className="fs-connect-icon wallet">
                <Wallet size={22} />
              </span>
              <div>
                <strong>{s.walletTitle}</strong>
                <p>{s.walletDetail}</p>
                <span className="fs-chip planned">{s.planned}</span>
              </div>
            </div>
            <a
              className="fs-feedback"
              href="https://t.me/freedomswordbot?start=feedback"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={16} />
              {s.feedback}
              <ArrowRight size={15} />
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
                {s.continue}
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
          onVerify={() => flow.perform('verify')}
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
          onAccept={(document) => flow.perform('agreement', document)}
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
            setDashboard(false);
            go('launch');
          }}
        />
      )}
    </div>
  );
}
