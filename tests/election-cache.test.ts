import { afterEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ client: null as unknown }));
vi.mock('@backend/redis', () => ({ redisClient: () => state.client }));
import { cachedElections, invalidateElectionCache } from '../backend/src/election-cache';

afterEach(() => { state.client = null; });

it('reuses public election reads and invalidates after a committed change', async () => {
  const values = new Map<string, string>();
  state.client = {
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: string) => { values.set(key, value); },
    incr: async (key: string) => {
      const next = Number(values.get(key) ?? '0') + 1;
      values.set(key, String(next));
      return next;
    },
  };
  const load = vi.fn(async () => []);
  expect((await cachedElections('', load)).source).toBe('database');
  expect((await cachedElections('', load)).source).toBe('cache');
  expect(load).toHaveBeenCalledTimes(1);
  await invalidateElectionCache();
  expect((await cachedElections('', load)).source).toBe('database');
  expect(load).toHaveBeenCalledTimes(2);
});

it('reads the primary database when Redis is unavailable', async () => {
  const load = vi.fn(async () => []);
  expect((await cachedElections('', load)).source).toBe('database');
  expect(load).toHaveBeenCalledOnce();
});

it('coalesces simultaneous cache misses into one database read', async () => {
  const values = new Map<string, string>();
  state.client = {
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: string) => { values.set(key, value); },
  };
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const load = vi.fn(async () => { await gate; return []; });
  const first = cachedElections('parallel', load);
  const second = cachedElections('parallel', load);
  release();
  await Promise.all([first, second]);
  expect(load).toHaveBeenCalledOnce();
});
