import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { BOT_WELCOME_DESCRIPTION } from '../src/core/bot-copy';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Set TELEGRAM_BOT_TOKEN in the backend environment');
const apply = process.argv.includes('--apply');
async function call(method: string, parameters: Record<string, string> = {}) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', body: new URLSearchParams(parameters), signal: AbortSignal.timeout(15_000),
    });
    const data = await response.json() as { ok: boolean; result: { username?: string; description?: string } };
    if (!data.ok) throw new Error('Rejected');
    return data.result;
  } catch { throw new Error(`Telegram ${method} failed`); }
}
if ((await call('getMe')).username !== 'freedomswordbot') throw new Error('Unexpected bot; no changes made');
if (BOT_WELCOME_DESCRIPTION.length > 512) throw new Error('Bot description exceeds Telegram limit');
const languages = ['', 'uk', 'en'];
const previous = await Promise.all(languages.map(async (language_code) => ({ language_code,
  ...await call('getMyDescription', { language_code }) })));
if (apply) {
  mkdirSync('.local-telegram', { recursive: true });
  writeFileSync(`.local-telegram/description-before-${Date.now()}.json`, JSON.stringify(previous), { mode: 0o600 });
  for (const language_code of languages) {
    await call('setMyDescription', { language_code, description: BOT_WELCOME_DESCRIPTION });
    if ((await call('getMyDescription', { language_code })).description !== BOT_WELCOME_DESCRIPTION)
      throw new Error('Bot description read-back did not match');
  }
  console.log('FreedomSword welcome description updated and verified.');
} else console.log(`Proposed welcome description (run with --apply to publish):\n${BOT_WELCOME_DESCRIPTION}`);
