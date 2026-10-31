import { randomUUID } from 'node:crypto';
import { ApiError } from './errors';
import { invitationContent, telegramInviteUrl } from '../../shared/invitation';

export function invitationResult(language: 'en' | 'uk', origin: string) {
  const copy = invitationContent[language];
  return {
    type: 'photo', id: randomUUID(),
    photo_url: new URL('/brand/invitation-teaser-v2.jpg', origin).href,
    thumbnail_url: new URL('/brand/invitation-teaser-v2.jpg', origin).href,
    photo_width: 720, photo_height: 360,
    caption: `${copy.text}\n\n${telegramInviteUrl}\n\n${copy.disclosure}`,
    show_caption_above_media: true,
    reply_markup: { inline_keyboard: [[{ text: language === 'uk' ? 'Відкрити FreedomSword у Telegram' : 'Open FreedomSword in Telegram', url: telegramInviteUrl }]] },
  };
}

/** Prepares a message only; the user chooses recipients and confirms in Telegram. */
export async function prepareInvitation(telegramId: string, language: 'en' | 'uk') {
  if (!/^[1-9]\d{0,15}$/.test(telegramId) || !Number.isSafeInteger(Number(telegramId)))
    throw new ApiError(400, 'A Telegram account is required to share a picture.');
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_ORIGIN;
  if (!token || !origin) throw new ApiError(503, 'Picture sharing is temporarily unavailable.');
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/savePreparedInlineMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({ user_id: Number(telegramId), result: invitationResult(language, origin),
        allow_user_chats: true, allow_group_chats: true, allow_channel_chats: true }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok || typeof data.result?.id !== 'string') throw new Error('Preparation failed');
    return { id: data.result.id as string };
  } catch { throw new ApiError(503, 'Picture sharing is temporarily unavailable.'); }
}
