# Fixed-IP backend deployment

The FreedomSword Mini App stays on Vercel. Its Express API and continuous Sepolia outbox worker run on one Linux server with a stable outbound IPv4 address. Atlas should allow only that observed outbound address as a `/32` entry. The API is exposed over HTTPS by Caddy; port 3001 remains private inside Docker Compose. Redis is also private to Compose and uses an append-only volume for its cache, rate-limit counters, and BullMQ jobs.

## Prerequisites

- A Linux server with Docker Engine and the Compose plugin, a fixed outbound IPv4 address, and enough storage for the Node image. Allow inbound TCP 80 and 443; restrict SSH to the operator's IP.
- A hostname such as `api.freedomsword.org` with an A record pointing to the server. Its DNS must resolve correctly before Caddy can obtain a certificate. Keep the frontend on `https://freedomsword.vercel.app` until the custom frontend domain works.
- A MongoDB Atlas user and replica-set URI with a database name. Add **only the server's observed outbound IPv4** to Atlas Network Access. Check the address from the server with `curl -4 https://api.ipify.org`; it may differ from the address used for inbound traffic.
- The existing Sepolia RPC, deployed voting contract, funded testnet relayer, and Telegram bot token. Store all credentials on the server, never in Git or the Vercel frontend project.

## Prepare the server

Clone this repository onto the server. Create a private `./.env.production` at the repository root from `backend/.env.example`. Set `API_DOMAIN` to the API hostname and set `APP_ENV=production`, `APP_ORIGIN=https://freedomsword.vercel.app`, `TELEGRAM_AUTH_ENABLED=true`, `RATE_LIMIT_BACKEND=mongo`, and `BLOCKCHAIN_ADAPTER=sepolia`. Fill the remaining required values using the [release variable table](../README.md#vercel-and-telegram-release). Set `DATABASE_URL` to an Atlas URI containing the database name. Use `chmod 600 .env.production` and keep it outside backups that are shared publicly.

The API and outbox containers receive the production environment. Caddy receives only `API_DOMAIN`. The image build context excludes environment files and keys through `.dockerignore`.

Compose sets `RATE_LIMIT_BACKEND=redis`, `REDIS_URL=redis://redis:6379`, and `OUTBOX_PROCESSING=worker` for the API. Redis rate limits fall back to MongoDB if Redis is unavailable. Casts and recalls still commit synchronously to MongoDB; only blockchain submission runs later. The worker consumes BullMQ wake-up jobs and polls the MongoDB outbox every five seconds as recovery. Do not tell a voter that a ballot is accepted until the database transaction succeeds. The two-second public-results cache can briefly lag a write if Redis invalidation fails. The backend uses the configured external HTTPS Sepolia RPC rather than a local blockchain node.

```sh
docker compose --env-file .env.production -f compose.backend.yaml up -d --build
docker compose --env-file .env.production -f compose.backend.yaml run --rm --no-deps api npx prisma db push --schema prisma/schema.prisma
```

If this is a new, empty demo database, seed fictional elections once:

```sh
docker compose --env-file .env.production -f compose.backend.yaml run --rm --no-deps api node dist/seed.js
```

Verify the API and worker before changing Vercel:

```sh
curl -fsS https://api.freedomsword.org/api/health
curl -fsS https://api.freedomsword.org/api/ready
curl -fsS https://api.freedomsword.org/api/elections
docker compose --env-file .env.production -f compose.backend.yaml ps
```

`/api/health` reports process liveness; `/api/ready` must report MongoDB `ok`. If readiness fails, check the exact Atlas `/32` entry and the container logs without printing `DATABASE_URL` or other secrets. The `outbox` container replaces Vercel's daily cron with continuous retry and receipt reconciliation.

In the **frontend** Vercel project, set `BACKEND_URL=https://api.freedomsword.org` for Production and redeploy. Then check `https://freedomsword.vercel.app/api/ready` and open the Mini App from Telegram. Keep the Vercel backend project unused or remove it after the new route is verified; its dynamic egress cannot reach a restricted Atlas list. Do not change the Telegram Mini App URL: it remains the frontend URL.

For later releases, pull the intended commit and rerun `docker compose --env-file .env.production -f compose.backend.yaml up -d --build`. Keep Caddy's named volumes so its certificates survive container replacement. Rotate any credentials previously shared in chat before public use.
