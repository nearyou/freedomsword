import { test } from 'node:test';
import assert from 'node:assert/strict';
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
