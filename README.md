# FreedomSword

FreedomSword is a Telegram Mini App MVP for **fictional elections**. Citizens can browse candidates, cast one 100-unit ballot, recall support under each election's policy, inspect aggregate results, and follow public audit commitments. The app is a demonstration: its current eligibility provider is a mock and it must not be used for binding elections.

The interface uses an ivory launch and Citizen Passport, followed by a restrained navy election area. Telegram launch data is validated on the server; opening the site in a browser provides a local preview only when development demo authentication is explicitly enabled.

## Stack and local start

Next.js 16 App Router, TypeScript, Prisma 6, MongoDB Atlas, Ethereum Sepolia via viem, Tailwind CSS, and Vitest. Use Node.js 22.12 or newer. MongoDB must be a replica set (Atlas satisfies this) for multi-document transactions.

1. Run `npm ci` and copy `.env.example` to an ignored `.env` file. Supply a MongoDB Atlas URI with a database name and three **different** random server secrets: `SESSION_SECRET`, `BALLOT_SECRET`, and `ELIGIBILITY_COMMITMENT_SECRET`.
2. Run `npm run db:push` to create collections and indexes, then `npm run db:seed` for fictional fixtures. `prisma db push` is used for MongoDB; the historical SQL migrations in `prisma/migrations` are archival and must not be run against Atlas.
3. Run `npm run dev`. `npm run check` runs typecheck, lint, and unit tests. `npm run test:integration` creates a uniquely named temporary Atlas database, runs real transaction tests, and drops only that test database. The Atlas user needs permissions for these operations.
4. Run `npm run build` for a production build. The `postinstall` hook generates Prisma Client.

`/api/health` checks process liveness and `/api/ready` checks MongoDB. The configured database is not seeded by `db:push`; use `db:seed` only where the fictional demo elections should appear. This migration does **not** import old PostgreSQL records. Do not point a new deployment at a previously used election until its data has been reviewed and migrated separately.

## Vercel and Telegram release

The user will create the Vercel deployment. Configure the following Vercel environment variables for the intended environment, including at build time:

| Variable | Value |
| --- | --- |
| `APP_ENV` | `production` for public deployment, `staging` for private testing |
| `DATABASE_URL` | Atlas `mongodb+srv://.../<database>` URI, stored only as a secret |
| `APP_ORIGIN`, `NEXT_PUBLIC_APP_URL` | The same exact production HTTPS origin, without a trailing slash |
| `TELEGRAM_AUTH_ENABLED`, `TELEGRAM_BOT_TOKEN` | `true` and the server-only token for `@freedomswordbot` |
| `TELEGRAM_AUTH_MAX_AGE_SECONDS`, `SESSION_MAX_AGE_SECONDS` | Explicit positive values such as `300` and `21600` |
| `SESSION_SECRET`, `BALLOT_SECRET`, `ELIGIBILITY_COMMITMENT_SECRET` | Three independent secrets of at least 32 characters |
| `ELIGIBILITY_PROVIDER`, `RATE_LIMIT_BACKEND` | `mock` and `mongo` |
| `BLOCKCHAIN_ADAPTER` | `sepolia` in production; `mock` is allowed in staging |
| `BLOCKCHAIN_SEPOLIA_RPC_URL`, `BLOCKCHAIN_SIGNER_PRIVATE_KEY` | Server-only HTTPS Sepolia RPC and funded testnet signer key when using Sepolia |
| `CRON_SECRET` | Independent random secret of at least 16 characters for scheduled outbox processing |
| `ALLOW_DEMO_AUTH` | `false` |

Before public release, rotate the Atlas password that was shared in chat and update the Vercel secret. Limit Atlas network and user access to what the deployment needs. Never put the URI, bot token, or signer key in a `NEXT_PUBLIC_` variable or Git.

Deploy the Node app, run `npm run db:push` and `npm run db:seed` against the chosen Atlas database once, then confirm `/api/ready`, `/elections`, and a fresh Telegram launch with a second account. Check cast, recall, and an audit record's Sepolia transaction and confirmation state. Only after the stable Vercel URL works should the operator change **both** the bot's Mini App menu URL and its separate Main Mini App setting in BotFather. A temporary Cloudflare tunnel remains temporary and is not a public deployment.

Vercel does not run `npm run outbox:worker` continuously. Each successful write attempts a bounded outbox flush and reconciliation; authenticated `POST /api/blockchain/retry` can process another batch. `vercel.json` also schedules an authenticated `/api/cron/outbox` run once per day, which is compatible with the [Vercel Hobby minimum interval](https://vercel.com/docs/cron-jobs/usage-and-pricing). Vercel adds the `CRON_SECRET` bearer header for scheduled calls as described in its [cron security guide](https://vercel.com/docs/cron-jobs/manage-cron-jobs). A more frequent external worker is needed if daily processing is too slow for the expected volume. Pending, submitted, and confirmed are distinct states; a transaction hash alone is not proof of finality. A restarted submission may send the same opaque commitment more than once, incurring extra testnet gas without exposing ballot data.

## Data and trust boundaries

MongoDB stores accounts, sessions, eligibility records, ballots, audit events, and outbox state. Multi-document transactions and unique indexes enforce the app's ballot workflow. The public audit chain contains salted commitments and linked hashes; Sepolia receives only an opaque 32-byte commitment in a zero-value transaction sent to the app's own signer address. It receives no Telegram ID, credential, ballot mapping, or vote choice. Public exports and the read-only `npm run audit:check` can detect many database changes, and an independently witnessed Sepolia commitment can provide an external comparison point. MongoDB has no replacement for the old PostgreSQL immutability triggers: a database administrator can directly alter records, so independent witnessing, backups, least-privilege access, and monitoring are essential. The app and signer can correlate identity with ballot through private credentials and keys; do not claim a secret ballot or production-grade decentralized election.

The current `ELIGIBILITY_PROVIDER=mock` verifies no real person and does not prevent one person from using multiple Telegram accounts. Rarimo and a Telegram wallet are **not** integrated. A Sepolia audit anchor does not change that limitation. Keep fictional/demo labeling visible.

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), [SECURITY.md](SECURITY.md), and [RECOVERY.md](RECOVERY.md) for implementation and operations. Telegram Mini App validation follows the [official Telegram specification](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app); MongoDB transaction setup follows [Prisma's MongoDB guide](https://www.prisma.io/docs/orm/v6/overview/databases/mongodb).
