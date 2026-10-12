import { describe, expect, it } from 'vitest';
import { demoAuthEnabled, loadConfig } from '../src/backend/config';

const valid = {
  NODE_ENV: 'production',
  APP_ENV: 'production',
  DATABASE_URL: 'mongodb+srv://user:password@db.example/democracy',
  APP_ORIGIN: 'https://vote.example',
  NEXT_PUBLIC_APP_URL: 'https://vote.example',
  TELEGRAM_AUTH_ENABLED: 'true',
  TELEGRAM_BOT_TOKEN: '123456:1234567890abcdefghijklmnopqrst',
  TELEGRAM_AUTH_MAX_AGE_SECONDS: '300',
  SESSION_MAX_AGE_SECONDS: '3600',
  SESSION_SECRET: '0123456789abcdef'.repeat(4),
  BALLOT_SECRET: 'fedcba9876543210'.repeat(4),
  ELIGIBILITY_COMMITMENT_SECRET: '13579bdf2468ace0'.repeat(4),
  ELIGIBILITY_PROVIDER: 'mock',
  RATE_LIMIT_BACKEND: 'mongo',
  BLOCKCHAIN_ADAPTER: 'sepolia',
  BLOCKCHAIN_SEPOLIA_RPC_URL: 'https://sepolia.example/rpc',
  BLOCKCHAIN_SIGNER_PRIVATE_KEY: `0x${'a'.repeat(64)}`,
  BLOCKCHAIN_CONTRACT_ADDRESS: `0x${'b'.repeat(40)}`,
  BLOCKCHAIN_CONTRACT_DEPLOYMENT_BLOCK: '1',
  CRON_SECRET: 'independent-cron-secret-for-outbox',
  ALLOW_DEMO_AUTH: 'false',
};

describe('startup configuration', () => {
  it('accepts explicit production settings without returning a client secret', () => {
    const config = loadConfig(valid);
    expect(config.mode).toBe('production');
    expect(config.authMaxAgeSeconds).toBe(300);
    expect(config.sessionMaxAgeSeconds).toBe(3600);
    expect(loadConfig({ ...valid, RATE_LIMIT_BACKEND: 'mongo' }).rateLimitBackend).toBe('mongo');
  });
  it.each([
    [{ DATABASE_URL: 'sqlite://x' }, 'DATABASE_URL'],
    [{ APP_ORIGIN: 'http://vote.example', NEXT_PUBLIC_APP_URL: 'http://vote.example' }, 'HTTPS'],
    [{ NEXT_PUBLIC_APP_URL: 'https://other.example' }, 'app URLs'],
    [
      { APP_ORIGIN: 'https://vote.example/', NEXT_PUBLIC_APP_URL: 'https://vote.example/' },
      'APP_ORIGIN',
    ],
    [{ SESSION_SECRET: 'weak' }, 'SESSION_SECRET'],
    [{ BALLOT_SECRET: valid.SESSION_SECRET }, 'BALLOT_SECRET'],
    [{ ELIGIBILITY_COMMITMENT_SECRET: valid.SESSION_SECRET }, 'ELIGIBILITY_COMMITMENT_SECRET'],
    [{ TELEGRAM_BOT_TOKEN: '' }, 'TELEGRAM_BOT_TOKEN'],
    [
      { SESSION_SECRET: 'GENERATE_A_UNIQUE_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS' },
      'SESSION_SECRET',
    ],
    [{ TELEGRAM_AUTH_ENABLED: 'sometimes' }, 'true'],
    [{ TELEGRAM_AUTH_MAX_AGE_SECONDS: '0' }, 'number'],
    [{ ELIGIBILITY_PROVIDER: 'unknown' }, 'mock'],
    [{ APP_ENV: 'development' }, 'APP_ENV'],
    [{ ALLOW_DEMO_AUTH: 'true' }, 'demo authentication'],
    [{ TELEGRAM_AUTH_ENABLED: 'false' }, 'Telegram authentication'],
    [{ BLOCKCHAIN_ADAPTER: 'mock' }, 'Sepolia blockchain'],
    [{ BLOCKCHAIN_CONTRACT_ADDRESS: '' }, 'voting contract'],
    [{ RATE_LIMIT_BACKEND: 'memory' }, 'MongoDB rate limits'],
    [{ CRON_SECRET: '' }, 'CRON_SECRET'],
  ])('rejects unsafe configuration %#', (change, pattern) => {
    expect(() => loadConfig({ ...valid, ...change })).toThrow(pattern);
  });
  it('supports a mock-only local development environment', () => {
    expect(
      loadConfig({
        ...valid,
        NODE_ENV: 'development',
        APP_ENV: 'development',
        TELEGRAM_AUTH_ENABLED: 'false',
        TELEGRAM_BOT_TOKEN: '',
        APP_ORIGIN: 'http://127.0.0.1:3000',
        NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3000',
        BLOCKCHAIN_ADAPTER: 'mock',
      }).authEnabled,
    ).toBe(false);
    expect(
      loadConfig({
        ...valid,
        NODE_ENV: 'test',
        APP_ENV: 'test',
        TELEGRAM_AUTH_ENABLED: 'false',
        TELEGRAM_BOT_TOKEN: '',
        APP_ORIGIN: 'http://127.0.0.1:3000',
        NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3000',
        BLOCKCHAIN_ADAPTER: 'mock',
      }).mode,
    ).toBe('test');
  });
  it('restricts demo authentication to an explicitly enabled development server', () => {
    expect(demoAuthEnabled({ NODE_ENV: 'development', APP_ENV: 'development', ALLOW_DEMO_AUTH: 'true' })).toBe(true);
    expect(demoAuthEnabled({ NODE_ENV: 'production', APP_ENV: 'development', ALLOW_DEMO_AUTH: 'true' })).toBe(false);
    expect(demoAuthEnabled({ NODE_ENV: 'development', APP_ENV: 'staging', ALLOW_DEMO_AUTH: 'true' })).toBe(false);
    expect(() => loadConfig({ ...valid, APP_ENV: 'staging', ALLOW_DEMO_AUTH: 'true' })).toThrow('demo authentication');
  });
});
