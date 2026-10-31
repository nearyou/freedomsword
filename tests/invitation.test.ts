import { afterEach, expect, it, vi } from 'vitest';
import { invitationResult, prepareInvitation } from '../backend/src/invitation';
import { POST } from '../backend/src/routes/invitation';
import { requireUser } from '../backend/src/auth';
import { invitationContent, telegramInviteUrl } from '../shared/invitation';

vi.mock('../backend/src/auth', () => ({ requireUser: vi.fn() }));
vi.mock('../backend/src/rate-limit', () => ({ enforceRateLimitAsync: vi.fn() }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each(['en', 'uk'] as const)('puts the approved %s text and Telegram link above the teaser image', (language) => {
  const result = invitationResult(language, 'https://freedomsword.org');
  expect(result.caption).toBe(`${invitationContent[language].text}\n\n${telegramInviteUrl}\n\n${invitationContent[language].disclosure}`);
  expect(result.caption.length).toBeLessThan(1024);
  expect(result.photo_url).toBe('https://freedomsword.org/brand/invitation-teaser-v2.jpg');
  expect(result.show_caption_above_media).toBe(true);
  expect(result.reply_markup.inline_keyboard[0][0].url).toBe(telegramInviteUrl);
});

it('prepares a photo only for the authenticated Telegram user and never sends a message', async () => {
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://freedomsword.org');
  vi.mocked(requireUser).mockResolvedValue({ id: 'citizen', telegramId: '123456789' } as Awaited<ReturnType<typeof requireUser>>);
  const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true, result: { id: 'prepared-message', expiration_date: 1 } }));
  vi.stubGlobal('fetch', fetch);
  const request = new Request('https://freedomsword.org/api/invitation', { method: 'POST', headers: { Origin: 'https://freedomsword.org', 'Content-Type': 'application/json' }, body: JSON.stringify({ language: 'uk' }) });
  const response = await POST(request);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: 'prepared-message' });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toMatch(/\/savePreparedInlineMessage$/);
  const payload = JSON.parse(fetch.mock.calls[0][1].body);
  expect(payload.user_id).toBe(123456789);
  expect(payload.result.caption).toContain(invitationContent.uk.text);
  expect(payload).not.toHaveProperty('chat_id');
});

it('rejects a supplied recipient and cross-origin preparation before contacting Telegram', async () => {
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://freedomsword.org');
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  for (const [origin, body] of [['https://freedomsword.org', { language: 'en', user_id: 987 }], ['https://other.invalid', { language: 'en' }]] as const) {
    const response = await POST(new Request('https://freedomsword.org/api/invitation', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
    expect(response.status).toBe(origin.includes('other') ? 403 : 400);
  }
  expect(fetch).not.toHaveBeenCalled();
});

it('rejects demo identities and hides upstream details on Telegram failure', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(prepareInvitation('demo:local', 'en')).rejects.toMatchObject({ status: 400 });
  expect(fetch).not.toHaveBeenCalled();
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'private-test-token');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://freedomsword.org');
  fetch.mockRejectedValue(new Error('private upstream details'));
  await expect(prepareInvitation('123456789', 'en')).rejects.toThrow('Picture sharing is temporarily unavailable.');
});
