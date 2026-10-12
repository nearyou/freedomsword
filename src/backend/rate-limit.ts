import { sha256 } from '@/shared/hash';
import { ApiError } from './errors';
import { serializable } from './transaction';

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
export class MongoRateLimitStore implements DistributedRateLimitStore {
  async consume(key: string, max: number, windowMs: number) {
    return serializable(async (tx) => {
      const now = new Date();
      const current = await tx.rateLimitCounter.findUnique({ where: { key } });
      if (!current) {
        await tx.rateLimitCounter.create({
          data: { key, count: 1, resetAt: new Date(now.getTime() + windowMs) },
        });
        return true;
      }
      const expired = current.resetAt <= now;
      const updated = await tx.rateLimitCounter.update({
        where: { key },
        data: expired
          ? { count: 1, resetAt: new Date(now.getTime() + windowMs) }
          : { count: { increment: 1 } },
      });
      return updated.count <= max;
    });
  }
}
let distributedBackend: DistributedRateLimitStore = new MongoRateLimitStore();
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
  if (process.env.RATE_LIMIT_BACKEND !== 'mongo') return enforceRateLimit(action, subject, max);
  const allowed = await distributedBackend.consume(`${action}:${sha256(subject)}`, max, 60_000);
  if (!allowed) {
    if (process.env.NODE_ENV !== 'test' && process.env.LOG_LEVEL !== 'error')
      console.warn(`Rate limit reached: ${action}`);
    throw new ApiError(429, 'Too many requests. Please wait a minute.', 'RATE_LIMITED');
  }
}
