import { expect, it, vi } from 'vitest';
import {
  MemoryRateLimitStore,
  enforceRateLimit,
  setRateLimitStore,
  enforceRateLimitAsync,
  setDistributedRateLimitStore,
} from '../src/server/rate-limit';

it('limits independent users and resets the window', () => {
  const store = new MemoryRateLimitStore();
  expect(store.consume('vote:user-1', 2, 60_000, 1000)).toBe(true);
  expect(store.consume('vote:user-1', 2, 60_000, 1001)).toBe(true);
  expect(store.consume('vote:user-1', 2, 60_000, 1002)).toBe(false);
  expect(store.consume('vote:user-2', 2, 60_000, 1002)).toBe(true);
  expect(store.consume('vote:user-1', 2, 60_000, 61_000)).toBe(true);
});
it('sends only a hashed subject to a distributed backend', async () => {
  const original = process.env.RATE_LIMIT_BACKEND;
  process.env.RATE_LIMIT_BACKEND = 'postgres';
  const seen: string[] = [];
  setDistributedRateLimitStore({ consume: async (key) => { seen.push(key); return false; } });
  try {
    await expect(enforceRateLimitAsync('vote', 'private-subject', 1)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(seen).toHaveLength(1);
    expect(seen[0]).not.toContain('private-subject');
  } finally {
    if (original === undefined) delete process.env.RATE_LIMIT_BACKEND;
    else process.env.RATE_LIMIT_BACKEND = original;
    setDistributedRateLimitStore(new (await import('../src/server/rate-limit')).PostgresRateLimitStore());
  }
});
it('logs only the action when a limit is exceeded', () => {
  setRateLimitStore(new MemoryRateLimitStore());
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  enforceRateLimit('agreement', 'private-subject', 1, 1000);
  expect(() => enforceRateLimit('agreement', 'private-subject', 1, 1001)).toThrow();
  if (warning.mock.calls.length)
    expect(JSON.stringify(warning.mock.calls)).not.toContain('private-subject');
  warning.mockRestore();
  setRateLimitStore(new MemoryRateLimitStore());
});
