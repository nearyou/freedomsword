'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, Copy, MoreHorizontal, Share2 } from 'lucide-react';
import { openTelegramLink, telegramHaptic } from '@frontend/hooks/useTelegram';
import { invitationCopy, invitationMessage, inviteUrl, getShareNetworks } from '@frontend/lib/share';
import { useLanguage } from '@frontend/hooks/useLanguage';
import SocialIcon from './SocialIcon';
import Dialog from '../ui/Dialog';
import { api } from '@frontend/lib/client-api';

export default function ShareInvite({ ready = false }: { ready?: boolean }) {
  const [language] = useLanguage();
  const copy = invitationCopy[language];
  const shareNetworks = getShareNetworks(language);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [more, setMore] = useState(false);
  const [instagram, setInstagram] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [shareFallback, setShareFallback] = useState(false);
  async function shareTelegram() {
    if (preparing) return;
    const app = window.Telegram?.WebApp;
    if (app?.initData && app.shareMessage && app.isVersionAtLeast('8.0')) {
      setPreparing(true); setShareFallback(false);
      try {
        const message = await api<{ id: string }>('invitation', { language });
        app.shareMessage(message.id);
      } catch { setShareFallback(true); }
      finally { setPreparing(false); }
    } else {
      setShareFallback(true);
      const url = shareNetworks.find((network) => network.name === 'Telegram')!.url;
      if (!openTelegramLink(url)) window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
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
  function link(name: string, iconOnly = false) {
    const network = shareNetworks.find((item) => item.name === name)!;
    return <a key={name} className={iconOnly ? 'share-network-icon' : 'button secondary'} data-network={name} aria-label={iconOnly ? name : undefined} title={iconOnly ? name : undefined} href={network.url} target={name === 'Email' ? undefined : '_blank'} rel="noopener noreferrer"
      onClick={(event) => {
        if (name === 'Telegram' && openTelegramLink(network.url)) event.preventDefault();
        if (name === 'Instagram') void copyInvitation(true);
      }}><SocialIcon name={name} /><span className={iconOnly ? 'sr-only' : undefined}>{name === 'Email' ? copy.email : name}</span></a>;
  }
  return <>
    <section className={`panel share-invite ${ready ? 'share-invite-ready' : ''}`} aria-labelledby="share-invite-title">
      <h3 id="share-invite-title">{ready ? language === 'uk' ? 'Запросіть друзів' : 'Invite your friends' : copy.title}</h3>
      <p className="invitation-message">{copy.text}</p>
      {!ready && <small className="fine-print">{copy.disclosure}</small>}
      <div className="share-invite-link"><a href={inviteUrl} aria-label={copy.open} target="_blank" rel="noopener noreferrer"
        onClick={(event) => { if (openTelegramLink(inviteUrl)) event.preventDefault(); }}>t.me/freedomswordbot?startapp</a>
        <button type="button" onClick={() => void copyInvitation()} aria-label={copy.copyLabel}>
          {copyState === 'copied' ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      {!ready && <figure className="invitation-teaser"><Image src="/brand/invitation-teaser-v2.jpg" width={720} height={360}
        alt={language === 'uk' ? 'Попередній перегляд FreedomSword: вибори та керування підтримкою' : 'A preview of FreedomSword: elections and managing your support'} unoptimized />
        <figcaption>Vote for a better future</figcaption></figure>}
      <button className="button primary share-telegram-picture" disabled={preparing} onClick={() => void shareTelegram()}>
        <SocialIcon name="Telegram" />{preparing ? language === 'uk' ? 'Готуємо…' : 'Preparing…' : language === 'uk' ? 'Поділитися в Telegram' : 'Share to Telegram'}
      </button>
      {shareFallback && <p className="share-image-fallback" role="status">{language === 'uk' ? 'Зображення зараз недоступне. Поділіться текстом і посиланням:' : 'Image sharing is unavailable here. Share the text and link:'} {link('Telegram')}</p>}
      <div className="share-invite-options">
        {ready && <button type="button" className="share-network-icon" data-network="Telegram" aria-label="Telegram" title="Telegram" disabled={preparing} onClick={() => void shareTelegram()}><SocialIcon name="Telegram" /></button>}
        {link('X', ready)}{link('Facebook', ready)}{link('WhatsApp', ready)}
        <button type="button" className={ready ? 'share-network-icon' : undefined} aria-label={copy.more} title={copy.more} aria-haspopup="dialog" onClick={() => setMore(true)}><MoreHorizontal size={18} /><span className={ready ? 'sr-only' : undefined}>{copy.more}</span></button>
      </div>
      {ready && <small className="fine-print">{copy.disclosure}</small>}
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
