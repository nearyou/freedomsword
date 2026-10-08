import 'dotenv/config';
import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL before integration tests');
const url = new URL(process.env.DATABASE_URL);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  throw new Error('Integration runner only creates temporary databases on localhost');
const name = `dd_test_${randomUUID().replaceAll('-', '')}`;
if (!/^dd_test_[a-f0-9]{32}$/.test(name)) throw new Error('Invalid test database name');
const adminUrl = new URL(url);
adminUrl.pathname = '/postgres';
adminUrl.search = '';
const client = new Client({ connectionString: adminUrl.toString() });
await client.connect();
url.pathname = `/${name}`;
let result = 1;
let created = false;
try {
  await client.query(`CREATE DATABASE "${name}"`);
  created = true;
  const env = { ...process.env, DATABASE_URL: url.toString(), INTEGRATION_TEST: 'true' };
  for (const command of [
    'npm run db:migrate',
    'npm run db:seed',
    'npx vitest run --config vitest.integration.config.ts',
  ]) {
    const run = spawnSync(command, { shell: true, env, stdio: 'inherit' });
    if (run.status !== 0) throw new Error(`Integration command failed: ${command}`);
  }
  result = 0;
} finally {
  if (created) await client.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await client.end();
}
process.exitCode = result;
