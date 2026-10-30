'use client';

import { useState } from 'react';
import { Check, Copy, MoreHorizontal, Share2 } from 'lucide-react';
import { openTelegramLink, telegramHaptic } from '@frontend/hooks/useTelegram';
import { invitationCopy, invitationMessage, inviteUrl, getShareNetworks } from '@frontend/lib/share';
import { useLanguage } from '@frontend/hooks/useLanguage';
import SocialIcon from './SocialIcon';
import Dialog from '../ui/Dialog';

export default function ShareInvite() {
  const [language] = useLanguage();
  const copy = invitationCopy[language];
  const shareNetworks = getShareNetworks(language);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [more, setMore] = useState(false);
  const [instagram, setInstagram] = useState(false);
  async function copyInvitation(forInstagram = false) {
    setInstagram(forInstagram);
    try {
      await navigator.clipboard.writeText(invitationMessage(language) + '\n' + inviteUrl);
      setCopyState('copied'); telegramHaptic('success');
    } catch { setCopyState('failed'); telegramHaptic('error'); }
  }
  async function deviceShare() {
    if (!navigator.share) { await copyInvitation(); return; }
    try { await navigator.share({ title: 'FreedomSword', text: invitationMessage(language), url: inviteUrl }); }
    catch (error) { if (!(error instanceof Error) || error.name !== 'AbortError') await copyInvitation(); }
  }
  function link(name: string) {
    const network = shareNetworks.find((item) => item.name === name)!;
    return <a key={name} className="button secondary" href={network.url} target={name === 'Email' ? undefined : '_blank'} rel="noopener noreferrer"
      onClick={(event) => {
        if (name === 'Telegram' && openTelegramLink(network.url)) event.preventDefault();
        if (name === 'Instagram') void copyInvitation(true);
      }}><SocialIcon name={name} />{name === 'Email' ? copy.email : name}</a>;
  }
  return <>
    <section className="panel share-invite" aria-labelledby="share-invite-title">
      <h3 id="share-invite-title">{copy.title}</h3>
      <p className="invitation-message">{copy.text}</p>
      <small className="fine-print">{copy.disclosure}</small>
      <div className="share-invite-link"><a href={inviteUrl} aria-label={copy.open} target="_blank" rel="noopener noreferrer"
        onClick={(event) => { if (openTelegramLink(inviteUrl)) event.preventDefault(); }}>t.me/freedomswordbot?startapp</a>
        <button type="button" onClick={() => void copyInvitation()} aria-label={copy.copyLabel}>
          {copyState === 'copied' ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <div className="share-invite-options">{link('Telegram')}{link('X')}{link('Facebook')}
        <button type="button" aria-haspopup="dialog" onClick={() => setMore(true)}><MoreHorizontal size={18} /> {copy.more}</button>
      </div>
      {copyState !== 'idle' && <p role="status">{copyState === 'copied' ? instagram ? copy.instagramCopied : copy.copied : copy.failed}</p>}
    </section>
    {more && <Dialog portal titleId="share-more-title" onClose={() => setMore(false)}>
      <h2 id="share-more-title">{copy.share}</h2>
      <p>{copy.choose}</p>
      <div className="share-networks">{shareNetworks.map((network) => link(network.name))}
        <button className="button secondary" onClick={() => void deviceShare()}><Share2 size={18} aria-hidden="true" />{copy.other}</button>
        <button className="button secondary" onClick={() => void copyInvitation()}><Copy size={18} aria-hidden="true" />{copy.copy}</button>
      </div>
      <p className="fine-print">{copy.instagram}</p>
      {copyState !== 'idle' && <p role="status">{copyState === 'copied' ? instagram ? copy.instagramCopied : copy.copied : copy.failed}</p>}
    </Dialog>}
  </>;
}
