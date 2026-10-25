'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, Copy, Send } from 'lucide-react';
import { openTelegramLink, telegramHaptic } from '@frontend/hooks/useTelegram';
import { inviteUrl, inviteText, shareDestinations } from '@frontend/lib/share';

export default function ShareInvite() {
  const [copyState, setCopyState] = useState<'idle' | 'link' | 'invitation' | 'failed'>('idle');

  async function copyLink(includeMessage = false) {
    try {
      await navigator.clipboard.writeText(includeMessage ? `${inviteText}\n${inviteUrl}` : inviteUrl);
      setCopyState(includeMessage ? 'invitation' : 'link');
      telegramHaptic('success');
    } catch {
      setCopyState('failed');
      telegramHaptic('error');
    }
  }

  async function shareMore() {
    if (typeof navigator.share !== 'function') {
      await copyLink(true);
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
          {copyState === 'link' ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      {copyState !== 'idle' && (
        <span className="share-invite-status" role="status">
          {copyState === 'failed' ? 'Copy failed. Use a share option below.' :
            copyState === 'invitation' ? 'Invitation and link copied.' : 'Link copied.'}
        </span>
      )}
      <div className="share-invite-options">
        {shareDestinations.map((destination) => <a
          key={destination.name}
          href={destination.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            if (destination.name === 'Telegram' && openTelegramLink(event.currentTarget.href))
              event.preventDefault();
          }}
        >
          <span className={`share-icon ${destination.style}`} aria-hidden="true">
            {destination.name === 'Telegram' ? <Send size={18} /> : destination.symbol}
          </span>
          {destination.name}
        </a>)}
        <button type="button" onClick={() => void copyLink(true)}>
          <span className="share-icon copy" aria-hidden="true"><Copy size={18} /></span>
          Copy invitation
        </button>
        <button type="button" onClick={() => void shareMore()}>
          <span className="share-icon more" aria-hidden="true"><ArrowUpRight size={18} /></span>
          More
        </button>
      </div>
      <p className="fine-print share-other-apps">For Instagram, TikTok and other installed apps,
        use More or paste the copied invitation into your post. Available apps depend on your device.</p>
    </section>
  );
}
