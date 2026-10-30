import type { Language } from '@frontend/components/welcome/copy';

export const inviteUrl = 'https://freedomsword.org';
export const invitationCopy = {
  en: {
    text: 'True democracy starts with your anonymous vote.\nDon’t wait until you’re allowed to vote in an election.\nVote now with me, and influence the country’s future.',
    disclosure: 'Fictional demo. Votes are visible to the operator.',
    title: 'There’s room for more voices', more: 'More', share: 'Share FreedomSword',
    choose: 'Choose a network or share through an app on your device.',
    copy: 'Copy invitation', copyLabel: 'Copy invitation and website link',
    copied: 'Invitation and website link copied.', failed: 'Copy failed. You can select and copy the invitation above.',
    other: 'Other apps', email: 'Email', subject: 'Join me on FreedomSword',
    instagram: 'For Instagram, we copy the invitation and open Instagram. Paste it into your post or message.',
    instagramCopied: 'Invitation copied. Paste it into your Instagram post or message.',
  },
  uk: {
    text: 'Справжня демократія починається з твого анонімного голосу.\nНе чекай, поки тобі дозволять голосувати на виборах.\nГолосуй зараз зі мною та впливай на майбутнє країни.',
    disclosure: 'Вигадане демо. Голоси доступні оператору.',
    title: 'Тут є місце для нових голосів', more: 'Більше', share: 'Поділитися FreedomSword',
    choose: 'Обери соціальну мережу або застосунок на своєму пристрої.',
    copy: 'Копіювати запрошення', copyLabel: 'Копіювати запрошення та посилання на сайт',
    copied: 'Запрошення та посилання скопійовано.', failed: 'Не вдалося скопіювати. Виділи та скопіюй запрошення вище.',
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
