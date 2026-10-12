import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL?.startsWith('mongodb'))
  dotenv.config({ path: '.env.mongodb', override: true });
if (!process.env.DATABASE_URL) throw new Error('Configure MongoDB DATABASE_URL before integration tests');
const source = new URL(process.env.DATABASE_URL);
if (!['mongodb:', 'mongodb+srv:'].includes(source.protocol))
  throw new Error('Integration tests require MongoDB');

const name = `fs_test_${randomUUID().replaceAll('-', '').slice(0, 24)}`;
if (!/^fs_test_[a-f0-9]{24}$/.test(name)) throw new Error('Invalid temporary database name');
const testUrl = new URL(source);
testUrl.pathname = `/${name}`;
if (!/^fs_test_[a-f0-9]{24}$/.test(testUrl.pathname.slice(1)))
  throw new Error('Refusing to use a non-test database');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run integration tests with npm run test:integration');
const env = {
  ...process.env,
  APP_ENV: 'test',
  APP_ORIGIN: 'http://127.0.0.1:3000',
  DATABASE_URL: testUrl.toString(),
  SESSION_SECRET: randomBytes(32).toString('hex'),
  BALLOT_SECRET: randomBytes(32).toString('hex'),
  ELIGIBILITY_COMMITMENT_SECRET: randomBytes(32).toString('hex'),
  TELEGRAM_AUTH_ENABLED: 'false',
  ELIGIBILITY_PROVIDER: 'mock',
  RATE_LIMIT_BACKEND: 'memory',
  BLOCKCHAIN_ADAPTER: 'mock',
  ALLOW_DEMO_AUTH: 'false',
  INTEGRATION_TEST: 'true',
};
let created = false;
try {
  for (const args of [
    ['run', 'db:push'],
    ['run', 'db:seed'],
  ]) {
    const run = spawnSync(process.execPath, [npmCli, ...args], { env, stdio: 'inherit' });
    if (args[1] === 'db:push' && run.status === 0) created = true;
    if (run.status !== 0) throw new Error(`Integration command failed: npm ${args.join(' ')}`);
  }
  const tests = spawnSync(process.execPath, [
    'node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.integration.config.ts',
    ...process.argv.slice(2),
  ], { env, stdio: 'inherit' });
  if (tests.status !== 0) throw new Error('MongoDB integration tests failed');
} finally {
  if (created) {
    const cleanup = new PrismaClient({ datasources: { db: { url: testUrl.toString() } } });
    try {
      await cleanup.$runCommandRaw({ dropDatabase: 1 });
    } finally {
      await cleanup.$disconnect();
    }
  }
}
