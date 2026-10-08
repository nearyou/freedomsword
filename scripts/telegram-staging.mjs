import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { Client } from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env.telegram-staging');
const statusPath = join(root, 'artifacts', 'telegram-staging-status.json');
const children = [];
let phase = 'configuration', origin, username, stopping = false;
mkdirSync(dirname(statusPath), { recursive: true });
function status(next, extra = {}) {
  phase = next;
  writeFileSync(statusPath, JSON.stringify({ phase, pid: process.pid, origin, username,
    updatedAt: new Date().toISOString(), ...extra }, null, 2));
  console.log(`Telegram staging: ${phase}${origin ? ` (${origin})` : ''}`);
}
function stop() {
  stopping = true;
  for (const child of children.toReversed()) child.kill();
}
process.on('SIGINT', () => { status('stopped'); stop(); });
process.on('SIGTERM', () => { status('stopped'); stop(); });
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
function listening(port, host = '127.0.0.1') {
  return new Promise((done) => {
    const socket = connect({ port, host });
    const finish = (result) => { socket.destroy(); done(result); };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(1000, () => finish(false));
  });
}
function start(command, args, env, output = false) {
  const child = spawn(command, args, { cwd: root, env, windowsHide: true,
    stdio: ['ignore', output ? 'pipe' : 'ignore', output ? 'pipe' : 'ignore'] });
  children.push(child);
  child.on('error', () => {});
  return child;
}
function run(command, args, env) {
  return new Promise((done, reject) => {
    const child = start(command, args, env);
    child.once('error', () => reject(new Error(`Could not start ${phase}`)));
    child.once('exit', (code) => code === 0 ? done() : reject(new Error(`${phase} failed`)));
  });
}
async function healthy(url, timeoutMs = 90_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until && !stopping) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: 'no-store' });
      if (response.ok) return response;
    } catch { /* Wait for the server or tunnel to become ready. */ }
    await delay(2000);
  }
  throw new Error(`${phase} did not become healthy`);
}
async function telegram(env, method, payload) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload ?? {}), signal: AbortSignal.timeout(20_000),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error('Telegram rejected the request');
    return data.result;
  } catch { throw new Error(`Telegram ${method} failed`); }
}

try {
  if (!existsSync(envPath)) throw new Error('Create .env.telegram-staging first');
  const originalEnv = readFileSync(envPath, 'utf8');
  const settings = parse(originalEnv);
  if (settings.APP_ENV !== 'staging' || settings.ALLOW_DEMO_AUTH !== 'false' ||
      settings.TELEGRAM_AUTH_ENABLED !== 'true' || !settings.TELEGRAM_BOT_TOKEN)
    throw new Error('Staging requires Telegram authentication and disabled demo login');
  const env = { ...process.env, ...settings, NODE_ENV: 'production' };
  const database = new URL(settings.DATABASE_URL);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname) ||
      database.pathname !== '/dd_telegram_staging' || database.port !== '55432')
    throw new Error('Use the isolated local dd_telegram_staging database on port 55432');
  if (await listening(3001)) throw new Error('Port 3001 is already in use; stop the old staging server first');
  username = (await telegram(env, 'getMe')).username;

  status('database');
  if (!(await listening(55432))) {
    const postgres = start(process.execPath, ['scripts/local-db.mjs'], { ...process.env });
    const until = Date.now() + 60_000;
    while (!(await listening(55432))) {
      if (postgres.exitCode !== null || Date.now() >= until) throw new Error('Local PostgreSQL did not start');
      await delay(1000);
    }
  }
  const client = new Client({ connectionString: settings.DATABASE_URL });
  try { await client.connect(); await client.query('SELECT 1'); }
  finally { await client.end(); }
  await run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], env);

  status('tunnel');
  const portable = join(tmpdir(), 'cloudflared-freedomsword.exe');
  const cloudflared = process.env.CLOUDFLARED_PATH ??
    (process.platform === 'win32' && existsSync(portable) ? portable : 'cloudflared');
  const tunnel = start(cloudflared, ['tunnel', '--url', 'http://127.0.0.1:3001',
    '--protocol', 'http2', '--no-autoupdate'], env, true);
  origin = await new Promise((done, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('Quick Tunnel did not provide a URL')), 60_000);
    const receive = (chunk) => {
      output = (output + chunk.toString()).slice(-8192);
      const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/);
      if (match) { clearTimeout(timeout); done(match[0]); }
    };
    tunnel.stdout.on('data', receive);
    tunnel.stderr.on('data', receive);
    tunnel.once('error', () => { clearTimeout(timeout); reject(new Error('Install cloudflared or set CLOUDFLARED_PATH')); });
    tunnel.once('exit', () => { clearTimeout(timeout); reject(new Error('Quick Tunnel stopped during startup')); });
  });
  env.APP_ORIGIN = origin;
  env.NEXT_PUBLIC_APP_URL = origin;
  const updateSetting = (text, key) => {
    const line = `${key}="${origin}"`;
    return new RegExp(`^${key}=.*$`, 'm').test(text)
      ? text.replace(new RegExp(`^${key}=.*$`, 'm'), line) : `${text.trimEnd()}\n${line}\n`;
  };
  writeFileSync(envPath, updateSetting(updateSetting(originalEnv, 'APP_ORIGIN'), 'NEXT_PUBLIC_APP_URL'));

  status('build');
  const nextEnvPath = join(root, 'next-env.d.ts');
  const nextEnv = existsSync(nextEnvPath) ? readFileSync(nextEnvPath) : null;
  try { await run(process.execPath, ['node_modules/next/dist/bin/next', 'build', '--webpack'], env); }
  finally { if (nextEnv) writeFileSync(nextEnvPath, nextEnv); }
  status('local-check');
  const server = start(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3001'], env);
  await healthy('http://127.0.0.1:3001/api/ready');
  status('public-check');
  for (const path of ['/', '/api/ready', '/api/elections', '/brand/logo.jpg'])
    await healthy(`${origin}${path}`);
  const home = await (await healthy(origin)).text();
  const script = home.match(/src="(\/_next\/static\/[^"\s]+\.js)"/);
  if (!script) throw new Error('The public home did not include its client bundle');
  await healthy(new URL(script[1].replaceAll('&amp;', '&'), origin));

  status('bot-menu');
  await telegram(env, 'setMyName', { name: 'FreedomSword' });
  if ((await telegram(env, 'getMyName')).name !== 'FreedomSword')
    throw new Error('Telegram did not confirm the FreedomSword bot name');
  const menu = { type: 'web_app', text: 'FreedomSword', web_app: { url: `${origin}/` } };
  await telegram(env, 'setChatMenuButton', { menu_button: menu });
  const saved = await telegram(env, 'getChatMenuButton');
  if (saved.type !== 'web_app' || saved.web_app?.url !== menu.web_app.url)
    throw new Error('Telegram did not confirm the new menu URL');
  status('connected', { serverPid: server.pid, tunnelPid: tunnel.pid });
  console.log(`Open https://t.me/${username} and use the FreedomSword menu button.`);
  console.log('Keep this process running. Quick Tunnel URLs are temporary.');
  for (const child of children) {
    if (child.exitCode !== null) continue;
    child.once('exit', () => {
      if (!stopping) { status('failed', { reason: 'A staging dependency stopped. Run npm run telegram:staging again.' }); stop(); }
    });
  }
} catch (error) {
  const reason = error instanceof Error ? error.message : 'Startup failed';
  status('failed', { reason });
  stop();
  process.exitCode = 1;
}
