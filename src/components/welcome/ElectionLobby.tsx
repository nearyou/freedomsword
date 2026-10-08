import { ArrowLeft, ArrowUpRight, Check, Landmark } from 'lucide-react';
import Link from 'next/link';
import type { WelcomeCopy } from './copy';
import { Ornament } from './WelcomeParts';

export default function ElectionLobby({
  t,
  preview,
  onBack,
}: {
  t: WelcomeCopy;
  preview: boolean;
  onBack: () => void;
}) {
  return (
    <main className="civic-lobby" aria-labelledby="civic-lobby-title">
      <button className="civic-back-button" type="button" onClick={onBack}>
        <ArrowLeft size={16} />
        {t.backWelcome}
      </button>
      <p className="civic-eyebrow">{t.dashboardEyebrow}</p>
      <h1 id="civic-lobby-title" tabIndex={-1}>
        {t.dashboardTitle}
      </h1>
      <p className="civic-lobby-intro">{t.dashboardCopy}</p>
      <Ornament />
      <section className="civic-readiness" aria-labelledby="civic-ready-title">
        <span className="civic-seal">
          <Check size={28} />
        </span>
        <div>
          <h2 id="civic-ready-title">{t.ready}</h2>
          <p>
            <Check size={13} />
            {t.identityDone}
          </p>
          <p>
            <Check size={13} />
            {t.agreementDone}
          </p>
        </div>
      </section>
      <article className="civic-election-preview">
        <div className="civic-election-heading">
          <span className="civic-seal">
            <Landmark size={31} strokeWidth={1.3} />
          </span>
          <span className="civic-status-pill">{t.comingSoon}</span>
        </div>
        <p className="civic-eyebrow">{t.electionType}</p>
        <h2>{t.electionTitle}</h2>
        <p>{t.electionCopy}</p>
        <Ornament small />
        <p className="civic-placeholder-note">{t.placeholderNotice}</p>
      </article>
      {!preview && (
        <Link href="/elections" className="civic-election-link">
          {t.existingElections}
          <ArrowUpRight size={17} />
        </Link>
      )}
      <p className="civic-demo-note">
        {preview ? `${t.preview} · ` : ''}
        {t.demonstration}
      </p>
    </main>
  );
}
