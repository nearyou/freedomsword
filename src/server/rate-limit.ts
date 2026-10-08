import { sha256 } from '@/lib/hash';
import { ApiError } from './errors';
import { db } from './db';

export interface RateLimitStore {
  consume(key: string, max: number, windowMs: number, now: number): boolean;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; until: number }>();

  consume(key: string, max: number, windowMs: number, now: number) {
    for (const [id, entry] of this.entries) if (entry.until <= now) this.entries.delete(id);
    const entry = this.entries.get(key) ?? { count: 0, until: now + windowMs };
    entry.count++;
    this.entries.set(key, entry);
    return entry.count <= max;
  }
}

let backend: RateLimitStore = new MemoryRateLimitStore();
export interface DistributedRateLimitStore {
  consume(key: string, max: number, windowMs: number): Promise<boolean>;
}
export class PostgresRateLimitStore implements DistributedRateLimitStore {
  async consume(key: string, max: number, windowMs: number) {
    const [row] = await db.$queryRaw<{ allowed: boolean }[]>`
      INSERT INTO "RateLimitCounter" ("key", "count", "resetAt")
      VALUES (${key}, 1, (clock_timestamp() AT TIME ZONE 'UTC') + (${windowMs} * INTERVAL '1 millisecond'))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitCounter"."resetAt" <= (clock_timestamp() AT TIME ZONE 'UTC')
          THEN 1 ELSE "RateLimitCounter"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimitCounter"."resetAt" <= (clock_timestamp() AT TIME ZONE 'UTC')
          THEN (clock_timestamp() AT TIME ZONE 'UTC') + (${windowMs} * INTERVAL '1 millisecond')
          ELSE "RateLimitCounter"."resetAt" END
      RETURNING "count" <= ${max} AS allowed`;
    return row.allowed;
  }
}
let distributedBackend: DistributedRateLimitStore = new PostgresRateLimitStore();
export function setDistributedRateLimitStore(store: DistributedRateLimitStore) {
  distributedBackend = store;
}
export function setRateLimitStore(store: RateLimitStore) {
  backend = store;
}
export function enforceRateLimit(action: string, subject: string, max = 40, now = Date.now()) {
  const key = `${action}:${sha256(subject)}`;
  if (!backend.consume(key, max, 60_000, now)) {
    if (process.env.NODE_ENV !== 'test' && process.env.LOG_LEVEL !== 'error')
      console.warn(`Rate limit reached: ${action}`);
    throw new ApiError(429, 'Too many requests. Please wait a minute.', 'RATE_LIMITED');
  }
}
export async function enforceRateLimitAsync(action: string, subject: string, max = 40) {
  if (process.env.RATE_LIMIT_BACKEND !== 'postgres') return enforceRateLimit(action, subject, max);
  const allowed = await distributedBackend.consume(`${action}:${sha256(subject)}`, max, 60_000);
  if (!allowed) {
    if (process.env.NODE_ENV !== 'test' && process.env.LOG_LEVEL !== 'error')
      console.warn(`Rate limit reached: ${action}`);
    throw new ApiError(429, 'Too many requests. Please wait a minute.', 'RATE_LIMITED');
  }
}
