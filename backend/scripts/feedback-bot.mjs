import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const welcome = 'Send your FreedomSword feedback or a screenshot here. Your message will be copied to the project team. Please do not send passwords, wallet keys or identity documents.';

export async function processFeedbackUpdate(update, call, destination) {
  const message = update.message;
  if (!message || message.chat?.type !== 'private' || message.from?.is_bot) return;
  const chat_id = String(message.chat.id);
  if (message.text === '/start' || message.text === '/help') {
    await call('sendMessage', { chat_id, text: welcome });
    return;
  }
  if (!message.text && !message.photo && !message.document && !message.video && !message.voice) {
    await call('sendMessage', { chat_id, text: 'Please send a message or a screenshot describing the issue.' });
    return;
  }
  // Copying omits the original sender's profile. No username or chat ID is added to the team's copy.
  await call('copyMessage', { chat_id: destination, from_chat_id: chat_id, message_id: message.message_id });
  await call('sendMessage', { chat_id, text: 'Thank you. Your feedback has been sent to the FreedomSword team.' });
}

async function main() {
  const token = process.env.FEEDBACK_BOT_TOKEN;
  const destination = process.env.FEEDBACK_CHAT_ID;
  if (!token || !/^-?\d+$/.test(destination ?? '') || token === process.env.TELEGRAM_BOT_TOKEN)
    throw new Error('Configure a separate FEEDBACK_BOT_TOKEN and numeric FEEDBACK_CHAT_ID');
  async function call(method, body = {}) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        signal: AbortSignal.timeout(40_000),
      });
      const result = await response.json();
      if (!result.ok) throw new Error('Rejected');
      return result.result;
    } catch { throw new Error(`Feedback bot ${method} failed`); }
  }
  const bot = await call('getMe');
  if (bot.username?.toLowerCase() === 'freedomswordbot') throw new Error('Feedback must use a separate bot');
  const stateFile = resolve(process.env.FEEDBACK_STATE_FILE || '.local-feedback/state.json');
  await mkdir(dirname(stateFile), { recursive: true });
  let offset = 0;
  try {
    const saved = JSON.parse(await readFile(stateFile, 'utf8'));
    if (!Number.isSafeInteger(saved.offset) || saved.offset < 0) throw new Error('Invalid offset');
    offset = saved.offset;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let stopping = false;
  process.on('SIGINT', () => { stopping = true; });
  process.on('SIGTERM', () => { stopping = true; });
  console.info('FreedomSword feedback bot running.');
  while (!stopping) {
    try {
      const updates = await call('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] });
      for (const update of updates) {
        await processFeedbackUpdate(update, call, destination);
        offset = update.update_id + 1;
        await writeFile(stateFile, JSON.stringify({ offset }), { mode: 0o600 });
      }
    } catch {
      console.error('Feedback delivery unavailable; the update will be retried.');
      if (!stopping) await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(resolve(process.argv[1]))).href)
  main().catch(() => { console.error('FreedomSword feedback bot could not start.'); process.exitCode = 1; });
