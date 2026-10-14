# FreedomSword

FreedomSword is a Telegram Mini App MVP for **fictional elections**. Citizens can browse candidates, cast one 100-unit ballot, recall support under each election's policy, inspect aggregate results, and follow public audit commitments. The app is a demonstration: its current eligibility provider is a mock and it must not be used for binding elections.

The interface uses an ivory launch and Citizen Passport, followed by a restrained navy election area. Telegram launch data is validated on the server; opening the site in a browser provides a local preview only when development demo authentication is explicitly enabled.

## Stack and local start

Independent Next.js 16 frontend and Express 5 backend workspaces, TypeScript, Prisma 6, MongoDB Atlas, Ethereum Sepolia via viem, Tailwind CSS, and Vitest. Use Node.js 22.12 or newer. MongoDB must be a replica set (Atlas satisfies this) for multi-document transactions. `frontend` contains pages and browser UI; `backend` contains Express routes, database and contract code. No source module is imported across the apps.

1. Run `npm ci`. Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`. Supply the backend with a MongoDB Atlas URI containing a database name and three **different** random server secrets: `SESSION_SECRET`, `BALLOT_SECRET`, and `ELIGIBILITY_COMMITMENT_SECRET`. The frontend needs only `BACKEND_URL` and its non-secret UI settings.
2. Run `npm run db:push` to create collections and indexes, then `npm run db:seed` for fictional fixtures.
3. Run `npm run dev` to start Express at `http://localhost:3001` and Next.js at `http://localhost:3000`. Frontend requests to `/api/*` are proxied to Express. Set backend `APP_ORIGIN=http://localhost:3000`; the browser keeps a same-origin session cookie. `npm run check` typechecks both apps, lints, and runs unit and contract tests. `npm run test:integration` creates a uniquely named temporary Atlas database, runs real transaction tests, and drops only that test database. The Atlas user needs permissions for these operations.
4. Run `npm run build` to bundle the Express server and build the Next.js frontend. Start the built API with `npm run start:backend`; `PORT` defaults to 3001. The backend build generates Prisma Client; frontend installs do not require the backend's Prisma CLI. For local API development before a build, run `npm run db:generate` after installing dependencies. Individual commands such as `npm run build -w @freedomsword/frontend` are also available.

`/api/health` checks process liveness and `/api/ready` checks MongoDB. The configured database is not seeded by `db:push`; use `db:seed` only where the fictional demo elections should appear.

### Passport-free local testing

Use the fictional demo flow while a Ukrainian passport tester is unavailable. Set `APP_ENV=development`, `ELIGIBILITY_PROVIDER=mock`, and `ALLOW_DEMO_AUTH=true` in `backend/.env`; set `ALLOW_DEMO_AUTH=true` in `frontend/.env`. Keep the backend `TELEGRAM_AUTH_ENABLED=false` only for this local browser test. After `npm run db:push`, `npm run db:seed`, and `npm run dev`, open `http://localhost:3000`, use the demo sign-in, complete the step explicitly marked **MOCK**, and test the legacy ballot and recall screens. This check proves no citizenship, age, or uniqueness, and the legacy ballot is visible to the operator.

The separate `LocalMaciTestGate` contract allows a MACI signup without a Rarimo proof **only on chain ID 31337**. `npm run contract:test` checks that guard. It is a contract test aid, not an app-level private vote: `MACI_PRIVATE` elections still cannot activate or accept ballots until a real MACI poll, client join proof, coordinator, and proof-verified tally are integrated. Do not deploy this gate to a public chain or present the mock demo as a private election.

## Vercel and Telegram release

Deploy two Vercel projects from this repository with root directories `backend` and `frontend`. Vercel detects the Express app exported from `backend/src/app.ts`; `backend/vercel.json` retains the outbox cron. Deploy the backend first and set the frontend's `BACKEND_URL` to the backend's HTTPS origin without a trailing slash. The frontend rewrites same-origin `/api/*` to that URL. Set backend `APP_ORIGIN` to the frontend's exact public HTTPS origin. Keep backend credentials entirely out of the frontend project. Configure these variables for the intended environment, including at build time:

| Project | Variable | Value |
| --- | --- | --- |
| Frontend | `APP_ENV`, `BACKEND_URL` | `production` and the backend HTTPS origin |
| Frontend | `ALLOW_DEMO_AUTH` | `false` |
| Backend | `APP_ENV`, `APP_ORIGIN` | `production` and the frontend HTTPS origin |
| Backend | `DATABASE_URL` | Atlas `mongodb+srv://.../<database>` URI, stored only as a secret |
| Backend | `TELEGRAM_AUTH_ENABLED`, `TELEGRAM_BOT_TOKEN` | `true` and the server-only token for `@freedomswordbot` |
| Backend | `TELEGRAM_AUTH_MAX_AGE_SECONDS`, `SESSION_MAX_AGE_SECONDS` | Explicit positive values such as `300` and `21600` |
| Backend | `SESSION_SECRET`, `BALLOT_SECRET`, `ELIGIBILITY_COMMITMENT_SECRET` | Three independent secrets of at least 32 characters |
| Backend | `ELIGIBILITY_PROVIDER`, `RATE_LIMIT_BACKEND` | `mock` and `mongo` |
| Backend | `BLOCKCHAIN_ADAPTER` | `sepolia` in production; `mock` is allowed in staging |
| Backend | `BLOCKCHAIN_SEPOLIA_RPC_URL`, `BLOCKCHAIN_SIGNER_PRIVATE_KEY` | Server-only HTTPS Sepolia RPC and funded testnet relayer key when using Sepolia |
| Backend | `BLOCKCHAIN_CONTRACT_ADDRESS`, `BLOCKCHAIN_CONTRACT_DEPLOYMENT_BLOCK` | Deployed `FreedomSwordVoting` address and its creation block for receipt recovery |
| Backend | `CRON_SECRET` | Independent random secret of at least 16 characters for scheduled outbox processing |
| Backend | `ALLOW_DEMO_AUTH` | `false` |

Before public release, rotate the Atlas password that was shared in chat and update the Vercel secret. Limit Atlas network and user access to what the deployment needs. Never put the URI, bot token, or signer key in a `NEXT_PUBLIC_` variable or Git.

Deploy the contract first with `npm run contract:deploy:sepolia` using a funded testnet account. This command spends testnet ETH and prints its address and deployment block; set both in the backend environment. Deploy both apps, run `npm run db:push` and `npm run db:seed` against the chosen Atlas database once, then confirm the frontend's `/api/ready`, `/elections`, and a fresh Telegram launch with a second account. Check cast, recall, and mined contract transactions before changing the bot's Mini App menu and Main Mini App settings to the **frontend** URL. A temporary Cloudflare tunnel remains temporary and is not a public deployment.

Vercel does not run `npm run outbox:worker` continuously. Each successful backend write attempts a bounded outbox flush and reconciliation; authenticated `POST /api/blockchain/retry` can process another batch. `backend/vercel.json` schedules an authenticated backend `/api/cron/outbox` run once per day, which is compatible with the [Vercel Hobby minimum interval](https://vercel.com/docs/cron-jobs/usage-and-pricing). Vercel adds the `CRON_SECRET` bearer header for scheduled calls as described in its [cron security guide](https://vercel.com/docs/cron-jobs/manage-cron-jobs). Pending, submitted, and confirmed are distinct states. Failed contract actions require investigation and reconciliation; a MongoDB commit and an Ethereum transaction are not atomic.

## Data and trust boundaries

MongoDB stores accounts, sessions, eligibility records, ballots, audit events, and outbox state. Multi-document transactions and unique indexes enforce the app's ballot workflow. The contract enforces one 100-unit ballot per opaque nullifier, immutable recall policy, remaining balance, delays, operation limits, and election windows. Its public storage and events reveal each nullifier's cast and recall timing, balance changes, and a salted choice commitment. Candidate membership and person eligibility remain server-side checks. Generic audit actions are anchored by commitment. MongoDB is the application ledger; Ethereum is an eventual, independently visible mirror. An administrator with database write access can alter records, and the relayer controls submissions. Do not claim a secret ballot or production-grade decentralized election.

The current `ELIGIBILITY_PROVIDER=mock` verifies no real person and does not prevent one person from using multiple Telegram accounts. Rarimo and a Telegram wallet are **not** integrated. The contract does not change that limitation. Keep fictional/demo labeling visible.

The selected future architecture is Rarimo-only eligibility and MACI encrypted voting with a trusted coordinator. It is not implemented or deployed. New private elections will require separate registration and tally paths; existing ballots and live aggregates must not be relabeled as private. See [the private voting decision](docs/PRIVATE_VOTING_DECISION.md).

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), [CONTRACT.md](CONTRACT.md), [SECURITY.md](SECURITY.md), and [RECOVERY.md](RECOVERY.md) for implementation and operations. Telegram Mini App validation follows the [official Telegram specification](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app); MongoDB transaction setup follows [Prisma's MongoDB guide](https://www.prisma.io/docs/orm/v6/overview/databases/mongodb).
