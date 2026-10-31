import type { Language } from '@frontend/components/welcome/copy';
import { invitationContent, telegramInviteUrl } from '../../../shared/invitation';

export const inviteUrl = telegramInviteUrl;
export const invitationCopy = {
  en: {
    ...invitationContent.en,
    title: 'There’s room for more voices', more: 'More', share: 'Share FreedomSword',
    choose: 'Choose a network or share through an app on your device.',
    copy: 'Copy invitation', copyLabel: 'Copy invitation and Telegram Mini App link',
    open: 'Open FreedomSword in Telegram',
    copied: 'Invitation and Telegram Mini App link copied.', failed: 'Copy failed. You can select and copy the invitation above.',
    other: 'Other apps', email: 'Email', subject: 'Join me on FreedomSword',
    instagram: 'For Instagram, we copy the invitation and open Instagram. Paste it into your post or message.',
    instagramCopied: 'Invitation copied. Paste it into your Instagram post or message.',
  },
  uk: {
    ...invitationContent.uk,
    title: 'Тут є місце для нових голосів', more: 'Більше', share: 'Поділитися FreedomSword',
    choose: 'Обери соціальну мережу або застосунок на своєму пристрої.',
    copy: 'Копіювати запрошення', copyLabel: 'Копіювати запрошення та посилання на міні застосунок у Telegram',
    open: 'Відкрити FreedomSword у Telegram',
    copied: 'Запрошення та посилання на міні застосунок у Telegram скопійовано.', failed: 'Не вдалося скопіювати. Виділи та скопіюй запрошення вище.',
    other: 'Інші застосунки', email: 'Електронна пошта', subject: 'Приєднуйся до мене у FreedomSword',
    instagram: 'Для Instagram ми копіюємо запрошення та відкриваємо Instagram. Встав його у допис або повідомлення.',
    instagramCopied: 'Запрошення скопійовано. Встав його у допис або повідомлення в Instagram.',
  },
} as const;
export const inviteText = invitationCopy.en.text;
export function invitationMessage(language: Language) {
  const copy = invitationCopy[language];
  return `${copy.text}\n\n${copy.disclosure}`;
}
export function getShareNetworks(language: Language) {
  const url = encodeURIComponent(inviteUrl);
  const text = encodeURIComponent(invitationMessage(language));
  const body = encodeURIComponent(`${invitationMessage(language)}\n${inviteUrl}`);
  return [
    { name: 'Telegram', url: `https://t.me/share/url?url=${url}&text=${text}` },
    { name: 'WhatsApp', url: `https://wa.me/?text=${body}` },
    { name: 'X', url: `https://x.com/intent/post?text=${text}&url=${url}` },
    { name: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${url}` },
    { name: 'Instagram', url: 'https://www.instagram.com/' },
    { name: 'LinkedIn', url: `https://www.linkedin.com/sharing/share-offsite/?url=${url}` },
    { name: 'Reddit', url: `https://www.reddit.com/submit?url=${url}&title=${text}` },
    { name: 'Email', url: `mailto:?subject=${encodeURIComponent(invitationCopy[language].subject)}&body=${body}` },
  ];
}
