'use client';

import { useState } from 'react';
import { Check, Copy, MoreHorizontal, Send } from 'lucide-react';
import { openTelegramLink, telegramHaptic } from '@frontend/hooks/useTelegram';
import { inviteText, inviteUrl, shareNetworks } from '@frontend/lib/share';
import Dialog from '../ui/Dialog';

export default function ShareInvite() {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [more, setMore] = useState(false);
  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(inviteText + '\n' + inviteUrl + '\n\nFictional-election demo. Current ballots are not anonymous to the operator.');
      setCopyState('copied'); telegramHaptic('success');
    } catch { setCopyState('failed'); telegramHaptic('error'); }
  }
  async function deviceShare() {
    if (!navigator.share) { await copyInvitation(); return; }
    try { await navigator.share({ title: 'FreedomSword', text: inviteText + '\n\nFictional-election demo; current ballots are not anonymous to the operator.', url: inviteUrl }); }
    catch (error) { if (!(error instanceof Error) || error.name !== 'AbortError') await copyInvitation(); }
  }
  function link(name: string) {
    const network = shareNetworks.find((item) => item.name === name)!;
    return <a key={name} className="button secondary" href={network.url} target={name === 'Email' ? undefined : '_blank'} rel="noopener noreferrer"
      onClick={(event) => {
        if (name === 'Telegram' && openTelegramLink(network.url)) event.preventDefault();
      }}>{name === 'Telegram' && <Send size={17} aria-hidden="true" />}{name}</a>;
  }
  return <>
    <section className="panel share-invite" aria-labelledby="share-invite-title">
      <h3 id="share-invite-title">There’s room for more voices</h3>
      <p>{inviteText}</p>
      <small className="fine-print">Fictional-election demo. Current ballots are not anonymous to the operator.</small>
      <div className="share-invite-link"><span>freedomsword.org</span>
        <button type="button" onClick={() => void copyInvitation()} aria-label="Copy invitation and website link">
          {copyState === 'copied' ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <div className="share-invite-options">{link('Telegram')}{link('X')}{link('Facebook')}
        <button type="button" aria-haspopup="dialog" onClick={() => setMore(true)}><MoreHorizontal size={18} /> More</button>
      </div>
      {copyState !== 'idle' && <p role="status">{copyState === 'copied' ? 'Invitation and website link copied.' : 'Copy failed. Select a network to share.'}</p>}
    </section>
    {more && <Dialog titleId="share-more-title" onClose={() => setMore(false)}>
      <h2 id="share-more-title">Share FreedomSword</h2>
      <p>Choose a network or share through an app on your device.</p>
      <div className="share-networks">{shareNetworks.map((network) => link(network.name))}
        <button className="button secondary" onClick={() => void deviceShare()}>Other apps</button>
        <button className="button secondary" onClick={() => void copyInvitation()}>Copy invitation</button>
      </div>
      <p className="fine-print">For Instagram, TikTok, Signal and other apps, use Other apps or paste the copied invitation into a post or message.</p>
      {copyState !== 'idle' && <p role="status">{copyState === 'copied' ? 'Invitation copied.' : 'Could not copy the invitation.'}</p>}
    </Dialog>}
  </>;
}
