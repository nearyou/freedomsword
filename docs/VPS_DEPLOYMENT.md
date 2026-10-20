# FreedomSword on one Ubuntu VPS (no Docker)

This deployment serves the Next.js frontend and Express API at `https://freedomsword.org`. Caddy routes `/api/*` directly to the API; both Node processes and Redis listen only on loopback. A systemd worker continuously processes the durable MongoDB blockchain outbox. MongoDB Atlas and the blockchain RPC remain external services. The current mock eligibility flow is a demonstration, not a binding election.

The scripts install into `/opt/freedomsword`, run as a dedicated `freedomsword` user, and keep the last release available for rollback. They do **not** change DNS or Telegram bot settings. Keep the current site online until the VPS checks pass.

## 1. Prepare the VPS and repository

Use an Ubuntu VPS with a system-wide Node.js 22.12+ installation, npm, Git, and outbound access to MongoDB Atlas. The Node executable must be usable by a non-root system user; an installation under `/root/.nvm` cannot run the services. Run `node --version` and `command -v node` to check. The scripts install Redis and Caddy through apt. Allow inbound TCP 80 and 443 at the VPS provider firewall; keep 3000, 3001, and 6379 closed to the public. Allowlist the VPS's **outbound** IPv4 in Atlas; `curl -4 https://api.ipify.org` shows it. It may differ from the inbound IP.

From the existing checkout on the VPS:

```bash
cd /root/freedomsword
git pull --ff-only
git status --short
```

The checkout must have no uncommitted project changes before deployment. Ignored `.env` files are fine. The release script deploys the checked-out commit and never copies Git history, ignored data, local databases, or build output.

## 2. Configure the backend

Create `backend/.env` from `backend/.env.example` if it does not exist, and edit it locally on the VPS. If it already exists, edit it in place; **do not overwrite the working Atlas URI**. Never paste its contents into chat or commit it.

For the current Telegram **mock** flow, these settings must be present:

```dotenv
NODE_ENV="production"
APP_ENV="staging"
HOST="127.0.0.1"
PORT="3001"
APP_ORIGIN="https://freedomsword.org"
TELEGRAM_AUTH_ENABLED="true"
TELEGRAM_AUTH_MAX_AGE_SECONDS="300"
SESSION_MAX_AGE_SECONDS="21600"
ELIGIBILITY_PROVIDER="mock"
RATE_LIMIT_BACKEND="redis"
REDIS_URL="redis://127.0.0.1:6379"
OUTBOX_PROCESSING="worker"
BLOCKCHAIN_ADAPTER="mock"
ALLOW_DEMO_AUTH="false"
```

Also set the existing `DATABASE_URL` to a working Atlas URI with a database name, `TELEGRAM_BOT_TOKEN` to the bot's current token, and three **different** random strings of at least 32 characters for `SESSION_SECRET`, `BALLOT_SECRET`, and `ELIGIBILITY_COMMITMENT_SECRET`. If `NEXT_PUBLIC_APP_URL` is set in this file, it must equal `https://freedomsword.org`. Rotate the Atlas password, Telegram bot token, and secrets exposed in earlier screenshots. Plan `BALLOT_SECRET` rotation around existing ballots because it can affect recalls. `APP_ENV=production` requires Sepolia contract and RPC configuration; do not switch to it merely to make this mock flow work.

```bash
chmod 600 backend/.env
```

The frontend uses `BACKEND_URL=http://127.0.0.1:3001` at build and runtime. The deployment script supplies this value; it is a server-only URL. The browser calls `/api/*` on `freedomsword.org`, and Caddy routes those requests to the API.

## 3. Install services and deploy

Stop any foreground `npm run dev` or `node ... dist/server.js` process with Ctrl+C first. The deployment script checks for occupied ports and will stop rather than terminate an unknown process.

```bash
cd /root/freedomsword
sudo bash deploy/vps/bootstrap.sh
sudo bash deploy/vps/deploy.sh
```

`bootstrap.sh` installs Redis and Caddy, creates the systemd units and Caddy site, and backs up an existing Caddyfile before replacing it. Use this on a VPS dedicated to FreedomSword. `deploy.sh` archives the checked-out commit to a new release directory, installs dependencies, builds both workspaces, switches the `current` symlink, and checks the local API and frontend. If an update fails its checks, it restores the previous release. It does not run `prisma db push` or seed data automatically. For a **new, empty** demo Atlas database, after reviewing the target URI and schema, run `npm run db:push` and then `npm run db:seed` from the source checkout once; do not reseed an existing database.

Check the services:

```bash
systemctl status freedomsword-api freedomsword-frontend freedomsword-worker redis-server caddy --no-pager
curl -fsS http://127.0.0.1:3001/api/ready
curl -fsS http://127.0.0.1:3000/
```

The readiness response must include `"mongodb":"ok"`. For a failure, inspect only the relevant service logs, without printing secrets:

```bash
journalctl -u freedomsword-api -u freedomsword-frontend -u freedomsword-worker -n 80 --no-pager
journalctl -u caddy -n 80 --no-pager
```

## 4. Point the domain to the VPS

At Porkbun, replace the **apex A** record for `freedomsword.org` that currently points to Vercel with an A record pointing to `45.61.162.179`. Keep unrelated MX, TXT, and NS records. The old `api` CNAME is unnecessary for this single-domain setup; it does not control the apex domain. If you only have Porkbun API access, use the included helper. It reads the zone, refuses an ambiguous apex A selection, asks Porkbun to validate the edit without changing DNS, and applies it only with `--apply`. It uses Porkbun's [DNS record API](https://porkbun.com/api/json/v3/documentation). Do not send API credentials to anyone.

```bash
read -r -s -p 'Porkbun API key: ' PORKBUN_API_KEY; echo
read -r -s -p 'Porkbun secret API key: ' PORKBUN_SECRET_API_KEY; echo
export PORKBUN_API_KEY PORKBUN_SECRET_API_KEY
node deploy/vps/porkbun-apex.mjs
node deploy/vps/porkbun-apex.mjs --apply
unset PORKBUN_API_KEY PORKBUN_SECRET_API_KEY
```

Ensure ports 80 and 443 are open at both the VPS provider firewall and any enabled UFW firewall:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
getent ahostsv4 freedomsword.org
curl -fsS https://freedomsword.org/api/ready
curl -fsS -o /dev/null -w '%{http_code}\n' https://freedomsword.org/
```

DNS should resolve to `45.61.162.179`. Once DNS and firewall access are correct, Caddy obtains and renews the HTTPS certificate. The API check must return MongoDB `ok`; the page check must return a successful status. No `api.freedomsword.org` certificate or Vercel `BACKEND_URL` change is needed.

## 5. Verify Telegram and later updates

Keep the Telegram Mini App URL at `https://freedomsword.org`. Open it from the bot, connect Telegram, complete the mock verification and agreement, and read the elections list. Test a cast and recall only in a fictional election. The public `/api/ready` check proves routing and database connectivity; it does not prove Telegram authentication, a confirmed Sepolia transaction, or a Rarimo/MACI proof.

For an update, pull a reviewed commit in `/root/freedomsword`, then run `sudo bash deploy/vps/deploy.sh` again. The release script leaves older release directories for rollback and never deletes them automatically. Keep the old Vercel deployment until the VPS domain and Telegram checks pass, then remove the Vercel domain/deployment if desired.
