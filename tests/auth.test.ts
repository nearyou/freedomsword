import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { validateInitData } from '../src/lib/telegram';
import { createSession, readSession } from '../src/lib/session';
const bot = '123:test-token';
function signed(date = 1000, user = '{"id":123,"first_name":"Private"}') {
  const params = new URLSearchParams({ auth_date: String(date), query_id: 'query', user });
  const check = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const key = createHmac('sha256', 'WebAppData').update(bot).digest();
  params.set('hash', createHmac('sha256', key).update(check).digest('hex'));
  return params.toString();
}
describe('Telegram validation', () => {
  it('validates and discards profile identity fields', () => {
    expect(validateInitData(signed(), bot, 1000)).toEqual({ telegramId: '123' });
  });
  it('rejects tampering and wrong token', () => {
    expect(() =>
      validateInitData(signed().replace('query_id=query', 'query_id=evil'), bot, 1000),
    ).toThrow();
    expect(() => validateInitData(signed(), 'wrong', 1000)).toThrow();
  });
  it('rejects stale, future and duplicate fields', () => {
    expect(() => validateInitData(signed(699), bot, 1000)).toThrow();
    expect(() => validateInitData(signed(1031), bot, 1000)).toThrow();
    expect(() => validateInitData(signed() + '&auth_date=1000', bot, 1000)).toThrow();
  });
  it('rejects bot and unsafe identifiers', () => {
    expect(() => validateInitData(signed(1000, '{"id":123,"is_bot":true}'), bot, 1000)).toThrow();
    expect(() => validateInitData(signed(1000, '{"id":9007199254740992}'), bot, 1000)).toThrow();
  });
  it('rejects missing hashes, malformed encoding, altered user data and a custom age limit', () => {
    const withoutHash = new URLSearchParams(signed());
    withoutHash.delete('hash');
    expect(() => validateInitData(withoutHash.toString(), bot, 1000)).toThrow();
    expect(() => validateInitData('user=%ZZ&auth_date=1000', bot, 1000)).toThrow();
    expect(() => validateInitData(signed().replace('Private', 'Public'), bot, 1000)).toThrow();
    expect(() => validateInitData(signed(980), bot, 1000, 15)).toThrow();
    expect(validateInitData(signed(980), bot, 1000, 30).telegramId).toBe('123');
  });
});
describe('sessions', () => {
  const id = 'd6235234-6895-425c-a4e0-4a61a3c19788';
  it('validates a signed session and rejects expiry/tampering', () => {
    const token = createSession(id, 1, 'secret', 1000);
    expect(readSession(token, 'secret', 1001).userId).toBe(id);
    expect(() => readSession(token, 'wrong', 1001)).toThrow();
    expect(() => readSession(token, 'secret', 21601000)).toThrow();
    expect(() => readSession('abc.invalid', 'secret')).toThrow();
  });
});
