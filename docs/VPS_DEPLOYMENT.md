# FreedomSword on one Ubuntu VPS (no Docker)

This deployment serves the Next.js frontend and Express API at `https://freedomsword.org`. Caddy routes `/api/*` directly to the API, redirects `www.freedomsword.org` to the apex, and serves the API at `api.freedomsword.org` for compatibility. Both Node processes and Redis listen only on loopback. A systemd worker continuously processes the durable MongoDB blockchain outbox. MongoDB Atlas and the blockchain RPC remain external services. The current mock eligibility flow is a demonstration, not a binding election.

The deployment scripts install into `/opt/freedomsword`, run as a dedicated `freedomsword` user, and keep the last release available for rollback. They do **not** change DNS or Telegram bot settings. The separate Porkbun DNS helper changes only the apex, `www`, and `api` web records. If DNS is pointed to the VPS before deployment, the site will remain unavailable until Caddy and both apps are running.

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

To reuse a local `backend/.env` without retyping secrets on the VPS, run this in PowerShell from the project directory on your PC:

```powershell
scp .\backend\.env root@45.61.162.179:/root/freedomsword/backend/.env.import
```

Then run this on the VPS after `git pull --ff-only`:

```bash
cd /root/freedomsword
python3 deploy/vps/prepare-env.py backend/.env.import backend/.env
```

The import keeps existing nonempty VPS values, including the Atlas URI and Telegram bot token, fills missing values from the local file, and sets the VPS-specific mock-flow settings below. It creates a mode-600 backup of an existing VPS `.env`, writes the result with mode 600, and removes the uploaded copy. It stops without replacing `.env` if a required secret is still missing. Do not use this command to switch a real Sepolia deployment to mock mode.

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

The frontend uses `BACKEND_URL=http://127.0.0.1:3001` at build and runtime. This is a private loopback connection on the VPS, not the public backend URL. The deployment script supplies it. Browsers reach the API over HTTPS at `https://freedomsword.org/api/*` or `https://api.freedomsword.org/api/*`; Caddy terminates TLS and forwards the request to the private API. Keep port 3001 closed to the public.

## 3. Install services and deploy

Stop any foreground `npm run dev` or `node ... dist/server.js` process with Ctrl+C first. The deployment script checks for occupied ports and will stop rather than terminate an unknown process.

```bash
cd /root/freedomsword
sudo bash deploy/vps/bootstrap.sh
sudo bash deploy/vps/deploy.sh
```

`bootstrap.sh` installs Redis and Caddy, creates the systemd units and Caddy site, and backs up an existing Caddyfile before replacing it. Run it again if an earlier FreedomSword deployment installed the old Caddyfile without `www` and `api` hosts. Use this on a VPS dedicated to FreedomSword. `deploy.sh` archives the checked-out commit to a new release directory, installs dependencies, builds both workspaces, switches the `current` symlink, and checks the local API and frontend. If an update fails its checks, it restores the previous release. It does not run `prisma db push` or seed data automatically. For a **new, empty** demo Atlas database, after reviewing the target URI and schema, run `npm run db:push` and then `npm run db:seed` from the source checkout once; do not reseed an existing database.

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

At Porkbun, point the **apex A** record to `45.61.162.179`, and point `www` and `api` CNAME records to `freedomsword.org`. Keep unrelated MX, TXT, wildcard, and NS records. The included helper reads the zone, refuses ambiguous web records, validates all changes with Porkbun, and applies them only with `--apply`. It uses Porkbun's [DNS record API](https://porkbun.com/api/json/v3/documentation). If the records are already set, it makes no changes. Keep credentials out of files, shell history, and chat.

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

DNS for the apex, `www`, and `api` should resolve to `45.61.162.179`. Once DNS and firewall access are correct, Caddy obtains and renews their HTTPS certificates. The API check must return MongoDB `ok`; the page check must return a successful status. Check `https://www.freedomsword.org/` redirects to the apex and `https://api.freedomsword.org/api/ready` returns readiness. No Vercel `BACKEND_URL` change is needed.

If the HTTPS API does not respond after deployment, check the VPS directly:

```bash
sudo systemctl status caddy freedomsword-api --no-pager
sudo caddy validate --config /etc/caddy/Caddyfile
sudo ss -lntp | grep -E ':(80|443|3001)\b'
curl -fsS http://127.0.0.1:3001/api/ready
curl -fsS https://api.freedomsword.org/api/ready
sudo journalctl -u caddy -n 80 --no-pager
```

The first `curl` checks the private API. The second checks public HTTPS and certificate issuance. If the first succeeds but the second fails, check that Caddy is running and TCP 80/443 are open in both UFW and the VPS provider firewall. Do not expose 3001 to fix HTTPS.

## 5. Verify Telegram and later updates

Keep the Telegram Mini App URL at `https://freedomsword.org`. Open it from the bot, connect Telegram, complete the mock verification and agreement, and read the elections list. Test a cast and recall only in a fictional election. The public `/api/ready` check proves routing and database connectivity; it does not prove Telegram authentication, a confirmed Sepolia transaction, or a Rarimo/MACI proof.

For an update, pull a reviewed commit in `/root/freedomsword`, then run `sudo bash deploy/vps/deploy.sh` again. The release script leaves older release directories for rollback and never deletes them automatically. Keep the old Vercel deployment until the VPS domain and Telegram checks pass, then remove the Vercel domain/deployment if desired.
