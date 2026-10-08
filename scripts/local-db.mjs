import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
const envPath = resolve('.env');
const passwordPath = resolve('.local-postgres-password');
const password = existsSync(passwordPath)
  ? readFileSync(passwordPath, 'utf8').trim()
  : randomBytes(24).toString('hex');
if (!existsSync(passwordPath)) writeFileSync(passwordPath, password, { mode: 0o600 });
const pg = new EmbeddedPostgres({
  databaseDir: resolve('.local-postgres'),
  port: 55432,
  user: 'democracy',
  password,
  authMethod: 'scram-sha-256',
  persistent: true,
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: (message) => console.error(message),
});
if (!existsSync(resolve('.local-postgres/PG_VERSION'))) await pg.initialise();
await pg.start();
const client = pg.getPgClient('postgres', '127.0.0.1');
await client.connect();
const { rows } = await client.query("SELECT 1 FROM pg_database WHERE datname = 'democracy'");
if (!rows.length) await client.query('CREATE DATABASE democracy');
await client.end();
if (!existsSync(envPath))
  writeFileSync(
    envPath,
    `APP_ENV="development"\nDATABASE_URL="postgresql://democracy:${password}@127.0.0.1:55432/democracy?schema=public"\nAPP_ORIGIN="http://127.0.0.1:3000"\nNEXT_PUBLIC_APP_URL="http://127.0.0.1:3000"\nTELEGRAM_AUTH_ENABLED="false"\nTELEGRAM_BOT_TOKEN=""\nTELEGRAM_AUTH_MAX_AGE_SECONDS="300"\nSESSION_SECRET="${randomBytes(32).toString('hex')}"\nSESSION_MAX_AGE_SECONDS="21600"\nBALLOT_SECRET="${randomBytes(32).toString('hex')}"\nELIGIBILITY_COMMITMENT_SECRET="${randomBytes(32).toString('hex')}"\nELIGIBILITY_PROVIDER="mock"\nRATE_LIMIT_BACKEND="memory"\nLOG_LEVEL="info"\nALLOW_DEMO_AUTH="true"\n`,
    { mode: 0o600 },
  );
console.log('Local PostgreSQL listening on 127.0.0.1:55432. Keep this process running.');
const timer = setInterval(() => {}, 60000);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    clearInterval(timer);
    await pg.stop();
    process.exit(0);
  });
