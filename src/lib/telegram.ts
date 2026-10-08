import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
const telegramUser = z.object({
  id: z.number().int().positive().refine(Number.isSafeInteger),
  is_bot: z.boolean().optional(),
});
export class TelegramAuthError extends Error {
  constructor(public readonly code: 'AUTH_INVALID' | 'AUTH_EXPIRED') {
    super(code);
  }
}
export function validateInitData(
  raw: string,
  botToken: string,
  now = Math.floor(Date.now() / 1000),
  maxAgeSeconds = 300,
) {
  if (
    !botToken ||
    !raw ||
    raw.length > 8192 ||
    [...raw].some((ch) => ch.charCodeAt(0) < 32) ||
    /%(?![0-9a-fA-F]{2})/.test(raw)
  )
    throw new TelegramAuthError('AUTH_INVALID');
  try {
    decodeURIComponent(raw.replaceAll('+', ' '));
  } catch {
    throw new TelegramAuthError('AUTH_INVALID');
  }
  const params = new URLSearchParams(raw);
  const seen = new Set<string>();
  for (const [key] of params) {
    if (!key || seen.has(key)) throw new TelegramAuthError('AUTH_INVALID');
    seen.add(key);
  }
  const receivedHash = params.get('hash') ?? '';
  if (!/^[a-f0-9]{64}$/i.test(receivedHash)) throw new TelegramAuthError('AUTH_INVALID');
  params.delete('hash');
  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const key = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', key).update(dataCheck).digest();
  if (!timingSafeEqual(expected, Buffer.from(receivedHash, 'hex')))
    throw new TelegramAuthError('AUTH_INVALID');
  const date = params.get('auth_date') ?? '';
  if (
    !/^\d+$/.test(date) ||
    !Number.isSafeInteger(Number(date)) ||
    now - Number(date) > maxAgeSeconds ||
    Number(date) - now > 30
  )
    throw new TelegramAuthError('AUTH_EXPIRED');
  let user: z.infer<typeof telegramUser>;
  try {
    user = telegramUser.parse(JSON.parse(params.get('user') ?? '{}'));
  } catch {
    throw new TelegramAuthError('AUTH_INVALID');
  }
  if (user.is_bot) throw new TelegramAuthError('AUTH_INVALID');
  return { telegramId: String(user.id) };
}
