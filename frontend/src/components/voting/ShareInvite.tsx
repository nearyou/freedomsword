'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Copy, Send } from 'lucide-react';
import { openTelegramLink, telegramHaptic } from '@frontend/hooks/useTelegram';

const inviteUrl = 'https://t.me/freedomswordbot';
const inviteText =
  'I made my choice on FreedomSword. Explore the candidates, make yours, and help shape what comes next.';
const encodedUrl = encodeURIComponent(inviteUrl);
const encodedText = encodeURIComponent(inviteText);

export default function ShareInvite() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState('copied');
      telegramHaptic('success');
    } catch {
      setCopyState('failed');
      telegramHaptic('error');
    }
  }

  async function shareMore() {
    if (typeof navigator.share !== 'function') {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: 'FreedomSword', text: inviteText, url: inviteUrl });
    } catch {
      /* The person closed the share sheet. */
    }
  }

  return (
    <section className="panel share-invite" aria-labelledby="share-invite-title">
      <h3 id="share-invite-title">Invite someone to take part</h3>
      <p>{inviteText}</p>
      <div className="share-invite-link">
        <span>t.me/freedomswordbot</span>
        <button type="button" onClick={() => void copyLink()} aria-label="Copy FreedomSword link">
          {copyState === 'copied' ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      {copyState !== 'idle' && (
        <span className="share-invite-status" role="status">
          {copyState === 'copied' ? 'Link copied.' : 'Copy failed. Use a share option below.'}
        </span>
      )}
      <div className="share-invite-options">
        <a
          href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            if (openTelegramLink(event.currentTarget.href)) event.preventDefault();
          }}
        >
          <span className="share-icon telegram" aria-hidden="true"><Send size={18} /></span>
          Telegram
        </a>
        <a
          href={`https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="share-icon x" aria-hidden="true">X</span>
          X
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="share-icon facebook" aria-hidden="true">f</span>
          Facebook
        </a>
        <button type="button" onClick={() => void shareMore()}>
          <span className="share-icon more" aria-hidden="true"><ArrowUpRight size={18} /></span>
          More
        </button>
      </div>
    </section>
  );
}
