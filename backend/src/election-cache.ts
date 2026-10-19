import type { ElectionView } from './transport';
import { sha256 } from './core/hash';
import { redisClient } from './redis';

const versionKey = 'freedomsword:elections:version';
const ttlSeconds = 2;
const pending = new Map<string, Promise<ElectionView[]>>();

export async function cachedElections(query: string, load: () => Promise<ElectionView[]>) {
  const redis = redisClient();
  if (!redis) return { elections: await load(), source: 'database' as const };
  let version: string;
  try { version = await redis.get(versionKey) ?? '0'; }
  catch { return { elections: await load(), source: 'database' as const }; }
  const key = `freedomsword:elections:${version}:${sha256(query)}`;
  try {
    const hit = await redis.get(key);
    if (hit) return { elections: JSON.parse(hit) as ElectionView[], source: 'cache' as const };
  } catch { /* Read from MongoDB if Redis is unavailable. */ }
  let task = pending.get(key);
  if (!task) {
    task = (async () => {
      const result = await load();
      try { await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds); }
      catch { /* Cache writes are best effort. */ }
      return result;
    })().finally(() => { pending.delete(key); });
    pending.set(key, task);
  }
  const elections = await task;
  return { elections, source: 'database' as const };
}

/** A failed invalidation can leave at most the short cache TTL of stale data. */
export async function invalidateElectionCache() {
  const redis = redisClient();
  if (!redis) return;
  try { await redis.incr(versionKey); }
  catch { /* The cache expires shortly even if Redis fails. */ }
}
