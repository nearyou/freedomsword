import Redis from 'ioredis';

let client: Redis | null = null;

/** Redis is an optional accelerator; MongoDB remains the ballot ledger. */
export function redisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!client) {
    client = new Redis(url, {
      connectTimeout: 500,
      commandTimeout: 500,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt) => Math.min(attempt * 200, 2_000),
    });
    client.on('error', () => { /* Cache and queue callers fall back to MongoDB. */ });
  }
  return client.status === 'ready' ? client : null;
}
