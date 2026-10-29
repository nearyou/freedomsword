import { mkdir, writeFile } from 'node:fs/promises';
import { configureFeedbackDescription, feedbackDescription } from './feedback-copy.mjs';

async function main() {
  if (!process.argv.includes('--apply')) {
    console.log(`Proposed Ukrainian feedback description (use --apply to publish):\n${feedbackDescription}`);
    return;
  }
  const token = process.env.FEEDBACK_BOT_TOKEN;
  if (!token || token === process.env.TELEGRAM_BOT_TOKEN) throw new Error('Configure a separate feedback token');
  async function call(method, body = {}) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      });
      const result = await response.json();
      if (!result.ok) throw new Error('Rejected');
      return result.result;
    } catch { throw new Error(`Feedback bot ${method} failed`); }
  }
  await configureFeedbackDescription(call, async (previous) => {
    await mkdir('.local-telegram', { recursive: true });
    await writeFile(`.local-telegram/feedback-description-before-${Date.now()}.json`, JSON.stringify(previous), { mode: 0o600 });
  });
  console.log('FreedomSword feedback description updated to Ukrainian and verified.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
