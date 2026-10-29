import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { processFeedbackUpdate } from '../backend/scripts/feedback-bot.mjs';
import { configureFeedbackDescription, feedbackDescription, feedbackShortDescription } from '../backend/scripts/feedback-copy.mjs';

const message = { update_id: 1, message: { message_id: 12, chat: { id: 21, type: 'private' },
  from: { id: 21, username: 'private-user', is_bot: false }, text: 'The button is broken' } };
test('copies feedback before acknowledging and omits profile information', async () => {
  const calls = [];
  await processFeedbackUpdate(message, async (method, body) => { calls.push({ method, body }); }, '-10023');
  assert.equal(calls[0].method, 'copyMessage');
  assert.equal(calls[0].body.chat_id, '-10023');
  assert.equal(calls[1].method, 'sendMessage');
  assert.match(calls[1].body.text, /Дякуємо/);
  assert.equal(JSON.stringify(calls).includes('private-user'), false);
});
test('propagates a failed delivery so polling can retry without acknowledging it', async () => {
  const calls = [];
  await assert.rejects(processFeedbackUpdate(message, async (method) => {
    calls.push(method); throw new Error('delivery failed');
  }, '-10023'));
  assert.deepEqual(calls, ['copyMessage']);
});
test('explains feedback delivery on start and ignores group chatter', async () => {
  const calls = [];
  const call = async (method, body) => { calls.push({ method, body }); };
  await processFeedbackUpdate({ message: { ...message.message, text: '/start' } }, call, '-10023');
  assert.equal(calls[0].method, 'sendMessage');
  assert.match(calls[0].body.text, /передано команді проєкту/);
  await processFeedbackUpdate({ message: { ...message.message, chat: { id: -10023, type: 'group' } } }, call, '-10023');
  assert.equal(calls.length, 1);
});

test('starts through the symlink used by release deployments instead of silently exiting', () => {
  const directory = mkdtempSync(join(tmpdir(), 'freedomsword-feedback-entry-'));
  const link = join(directory, 'current');
  let linked = false;
  try {
    symlinkSync(resolve('backend/scripts'), link, process.platform === 'win32' ? 'junction' : 'dir');
    linked = true;
    const result = spawnSync(process.execPath, [join(link, 'feedback-bot.mjs')], {
      encoding: 'utf8', timeout: 10_000,
      env: { ...process.env, FEEDBACK_BOT_TOKEN: '', FEEDBACK_CHAT_ID: '' },
    });
    // Reaching validation proves main ran; invalid empty credentials avoid all network calls.
    assert.equal(result.status, 1);
    assert.match(result.stderr, /FreedomSword feedback bot could not start/);
  } finally {
    if (linked) unlinkSync(link);
    rmdirSync(directory);
  }
});

test('publishes Ukrainian feedback descriptions for all configured client languages and verifies them', async () => {
  const descriptions = new Map(), shortDescriptions = new Map();
  let backedUp = false;
  assert.ok(feedbackDescription.length <= 512);
  assert.ok(feedbackShortDescription.length <= 120);
  await configureFeedbackDescription(async (method, body = {}) => {
    if (method === 'getMe') return { username: 'freedomsword_feedback_bot' };
    if (method.startsWith('set')) assert.equal(backedUp, true);
    if (method === 'setMyDescription') descriptions.set(body.language_code, body.description);
    if (method === 'setMyShortDescription') shortDescriptions.set(body.language_code, body.short_description);
    if (method === 'getMyDescription') return { description: descriptions.get(body.language_code) ?? 'Previous description' };
    if (method === 'getMyShortDescription') return { short_description: shortDescriptions.get(body.language_code) ?? 'Previous short description' };
    return true;
  }, async (previous) => { assert.equal(previous.length, 3); backedUp = true; });
  for (const language of ['', 'uk', 'en']) {
    assert.equal(descriptions.get(language), feedbackDescription);
    assert.equal(shortDescriptions.get(language), feedbackShortDescription);
  }
});

test('does not modify the main bot or accept mismatched Telegram read-back', async () => {
  const calls = [];
  await assert.rejects(configureFeedbackDescription(async (method) => {
    calls.push(method); return { username: 'freedomswordbot' };
  }), /Unexpected feedback bot/);
  assert.deepEqual(calls, ['getMe']);
  await assert.rejects(configureFeedbackDescription(async (method) => method === 'getMe'
    ? { username: 'freedomsword_feedback_bot' } : {}), /read-back/);
});
