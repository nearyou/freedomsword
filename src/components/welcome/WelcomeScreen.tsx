'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import {
  ArrowLeft,
  Blocks,
  ChevronDown,
  FileSignature,
  Globe2,
  Landmark,
  MoreHorizontal,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { nextWelcomeStep } from '@/lib/welcome';
import { copy, type Language } from './copy';
import { useWelcomeFlow } from './useWelcomeFlow';
import { CitizenIdentityIcon, GoldButton, Ornament, StepCard } from './WelcomeParts';
import { AgreementModal, InfoModal, VerificationModal } from './WelcomeModals';
import ElectionLobby from './ElectionLobby';

type Modal = 'verification' | 'agreement' | 'about' | 'privacy' | 'exit' | null;

export default function WelcomeScreen() {
  const [lang, setLang] = useState<Language>('en');
  const [modal, setModal] = useState<Modal>(null);
  const [dashboard, setDashboard] = useState(false);
  const telegram = useTelegram();
  const flow = useWelcomeFlow(telegram.launch);
  const t = copy[lang];
  const ready = flow.verified && flow.accepted;
  const available = telegram.launch === 'ready' || telegram.launch === 'outside';

  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [lang]);
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute('content');
    meta?.setAttribute('content', '#F8F3E8');
    if (telegram.launch === 'ready') {
      const webapp = window.Telegram?.WebApp;
      if (webapp?.isVersionAtLeast('6.1')) {
        webapp.setHeaderColor('#F8F3E8');
        webapp.setBackgroundColor('#F8F3E8');
      }
    }
    return () => {
      if (previous) meta?.setAttribute('content', previous);
    };
  }, [telegram.launch]);
  useEffect(() => {
    if (dashboard) document.getElementById('civic-lobby-title')?.focus();
  }, [dashboard]);

  function open(next: Modal) {
    if (!flow.busy) {
      flow.clearError();
      setModal(next);
    }
  }
  function back() {
    setModal(null);
    setDashboard(false);
    scrollToTop();
  }
  function proceed() {
    if (flow.busy) return;
    const step = nextWelcomeStep(flow.verified, flow.accepted);
    if (step === 'dashboard') {
      setModal(null);
      setDashboard(true);
      scrollToTop();
    } else open(step);
  }
  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }
  function closeApp() {
    if (telegram.launch === 'ready' && window.Telegram?.WebApp.close)
      window.Telegram.WebApp.close();
    else open('exit');
  }

  return (
    <div className="welcome-root" lang={lang} data-telegram={telegram.launch === 'ready'}>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onReady={telegram.onReady}
        onError={telegram.onError}
      />
      <div className="welcome-sheet" data-modal-background>
        <header className="welcome-header">
          <button className="welcome-close" type="button" onClick={closeApp}>
            <ArrowLeft size={20} strokeWidth={1.7} />
            <span>{t.close}</span>
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
            <MoreHorizontal size={21} />
          </button>
        </header>
        <div className="welcome-language-row">
          <label className="welcome-language">
            <Globe2 size={18} strokeWidth={1.5} aria-hidden="true" />
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
          <ElectionLobby t={t} preview={flow.preview} onBack={back} />
        ) : (
          <main className="welcome-main" aria-labelledby="welcome-title">
            <section className="welcome-hero">
              <Image
                className="welcome-logo"
                src="/brand/logo.jpg"
                alt="FreedomSword — original sword and laurel emblem"
                width={1024}
                height={1024}
                sizes="(max-width: 480px) 59vw, 300px"
                loading="eager"
                fetchPriority="high"
                unoptimized
              />
              <h1 id="welcome-title">{t.title}</h1>
              <p className="welcome-subtitle">
                {t.subtitle}
                <br />
                {t.subtitleSecond}
              </p>
              <Ornament />
            </section>
            <div className="welcome-steps">
              <StepCard
                number={1}
                title={t.verify}
                description={t.verifyCopy}
                icon={CitizenIdentityIcon}
                complete={flow.verified}
                onClick={() => open('verification')}
                t={t}
              />
              <StepCard
                number={2}
                title={t.agreement}
                description={t.agreementCopy}
                icon={FileSignature}
                complete={flow.accepted && flow.verified}
                onClick={() => open('agreement')}
                t={t}
              />
            </div>
            <section className="welcome-features" aria-label={t.featuresNote}>
              {[
                { icon: Landmark, label: t.official },
                { icon: ScrollText, label: t.constitutional },
                { icon: Blocks, label: t.blockchain },
              ].map(({ icon: Icon, label }) => (
                <div className="welcome-feature" key={label}>
                  <span className="civic-seal">
                    <Icon size={28} strokeWidth={1.3} aria-hidden="true" />
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </section>
            <p className="welcome-features-note">{t.featuresNote}</p>
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
            <GoldButton
              type="button"
              className="welcome-primary"
              onClick={proceed}
              disabled={flow.busy}
              busy={flow.busy}
            >
              {flow.busy ? t.connecting : ready ? t.continueReady : t.continue}
            </GoldButton>
            <button className="welcome-privacy" type="button" onClick={() => open('privacy')}>
              <ShieldCheck size={19} strokeWidth={1.4} />
              <span>{t.privacy}</span>
            </button>
            <p className="welcome-demo-note">{t.demonstration}</p>
            <nav className="welcome-pagination" aria-label={t.progress}>
              <span aria-hidden="true" />
              {(['verification', 'agreement', 'dashboard'] as const).map((step, index) => (
                <button
                  key={step}
                  type="button"
                  className={nextWelcomeStep(flow.verified, flow.accepted) === step ? 'active' : ''}
                  aria-label={[t.verify, t.agreement, t.continueReady][index]}
                  aria-current={
                    nextWelcomeStep(flow.verified, flow.accepted) === step ? 'step' : undefined
                  }
                  onClick={() => (step === 'dashboard' ? proceed() : open(step))}
                />
              ))}
              <span aria-hidden="true" />
            </nav>
          </main>
        )}
        <footer className="welcome-footer" aria-hidden="true">
          <span /> <i>✦</i> <span />
        </footer>
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
        <InfoModal t={t} kind={modal} onClose={() => setModal(null)} onWelcome={back} />
      )}
    </div>
  );
}
