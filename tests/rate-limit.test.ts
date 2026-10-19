import { expect, it, vi } from 'vitest';
import {
  MemoryRateLimitStore,
  enforceRateLimit,
  setRateLimitStore,
  enforceRateLimitAsync,
  setDistributedRateLimitStore,
  setRedisRateLimitStore,
} from '../backend/src/rate-limit';

it('limits independent users and resets the window', () => {
  const store = new MemoryRateLimitStore();
  expect(store.consume('vote:user-1', 2, 60_000, 1000)).toBe(true);
  expect(store.consume('vote:user-1', 2, 60_000, 1001)).toBe(true);
  expect(store.consume('vote:user-1', 2, 60_000, 1002)).toBe(false);
  expect(store.consume('vote:user-2', 2, 60_000, 1002)).toBe(true);
  expect(store.consume('vote:user-1', 2, 60_000, 61_000)).toBe(true);
});
it('routes distributed limits to Redis when configured', async () => {
  const original = process.env.RATE_LIMIT_BACKEND;
  process.env.RATE_LIMIT_BACKEND = 'redis';
  const consume = vi.fn(async (key: string, max: number, windowMs: number) => {
    expect(key).toContain('vote:');
    expect(max).toBe(1);
    expect(windowMs).toBe(60_000);
    return false;
  });
  setRedisRateLimitStore({ consume });
  try {
    await expect(enforceRateLimitAsync('vote', 'private-subject', 1))
      .rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(consume).toHaveBeenCalledOnce();
    expect(consume.mock.calls[0][0]).not.toContain('private-subject');
  } finally {
    if (original === undefined) delete process.env.RATE_LIMIT_BACKEND;
    else process.env.RATE_LIMIT_BACKEND = original;
    setRedisRateLimitStore(new (await import('../backend/src/rate-limit')).RedisRateLimitStore());
  }
});
it('sends only a hashed subject to a distributed backend', async () => {
  const original = process.env.RATE_LIMIT_BACKEND;
  process.env.RATE_LIMIT_BACKEND = 'mongo';
  const seen: string[] = [];
  setDistributedRateLimitStore({ consume: async (key) => { seen.push(key); return false; } });
  try {
    await expect(enforceRateLimitAsync('vote', 'private-subject', 1)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(seen).toHaveLength(1);
    expect(seen[0]).not.toContain('private-subject');
  } finally {
    if (original === undefined) delete process.env.RATE_LIMIT_BACKEND;
    else process.env.RATE_LIMIT_BACKEND = original;
    setDistributedRateLimitStore(new (await import('../backend/src/rate-limit')).MongoRateLimitStore());
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
