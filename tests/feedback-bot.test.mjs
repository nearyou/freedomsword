import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { processFeedbackUpdate } from '../backend/scripts/feedback-bot.mjs';

const message = { update_id: 1, message: { message_id: 12, chat: { id: 21, type: 'private' },
  from: { id: 21, username: 'private-user', is_bot: false }, text: 'The button is broken' } };
test('copies feedback before acknowledging and omits profile information', async () => {
  const calls = [];
  await processFeedbackUpdate(message, async (method, body) => { calls.push({ method, body }); }, '-10023');
  assert.equal(calls[0].method, 'copyMessage');
  assert.equal(calls[0].body.chat_id, '-10023');
  assert.equal(calls[1].method, 'sendMessage');
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
  assert.match(calls[0].body.text, /copied to the project team/);
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
