# FreedomSword

Latest client upgrade and deployment notes: [27 October prototype-9 update](docs/CLIENT_UPGRADE_2026-10-27.md).

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

The separate `LocalMaciTestGate` contract allows a MACI signup without a Rarimo proof **only on chain ID 31337**. `npm run contract:test` checks that guard. Do not deploy this gate to a public chain or present the mock demo as verified Ukrainian eligibility.

To run a disposable blockchain test network, start `npm run testnet:node` in one terminal. It serves a local Hardhat JSON-RPC chain on `http://127.0.0.1:8545` with chain ID `31337`. In another terminal, run `npm run testnet:smoke`. The smoke test deploys the Rarimo gate with **mock** registry, verifier, and MACI target contracts, submits one synthetic registration, and checks that an invalid proof and a replay are rejected. It prints the temporary contract addresses and transaction hash. Stop the node to erase this chain; its unlocked accounts and funds are public development fixtures. This local smoke test does **not** verify a passport or connect to the live Rarimo registry.

Managers can create a `MACI_PRIVATE` draft and configure an already deployed local MACI v3 poll in `/admin`. The backend checks the supplied contracts, candidate order, dates, non-quadratic mode, and 100 voice credits. A configured local poll can be activated in development/test mode only. Set `PRIVATE_VOTING_RPC_URL` and `PRIVATE_VOTING_SIGNER_PRIVATE_KEY` for the backend; the signer owns `LocalMaciTestGate`. The local ballot generates its MACI key and poll-join proof in the browser, submits only a public registration key and encrypted vote messages, and keeps the private key in browser session storage with a user-controlled backup. Place matching test poll-joining `.wasm`, `.zkey`, and verification-key `.json` artifacts in the ignored `frontend/public/zk/` directory, then set `NEXT_PUBLIC_MACI_JOIN_WASM_URL`, `NEXT_PUBLIC_MACI_JOIN_ZKEY_URL`, and `NEXT_PUBLIC_MACI_JOIN_VKEY_URL` to same-origin `/zk/...` paths before building the frontend. The browser verifies its generated proof before submission; the poll must use verifying keys matching those artifacts. Never put the voter or coordinator private key in frontend environment variables.

This is a **local test flow**, not a completed production private-election release. A submitted ciphertext is not a counted vote. After the poll closes, the operator must run the MACI coordinator and submit its processing, tally, and per-option result proofs on-chain using the official MACI tools. The election manager can then use **Publish verified private results**; the backend reads verified on-chain totals and requires at least 300 counted units (at least three 100-credit voters) before publication. MACI v3 test artifacts are for development only; the official quick start says the ceremony artifacts currently support up to v2.x.

### Rarimo-verified private registration

The Rarimo registration path is implemented for MACI private elections on Rarimo L2 (chain ID 7368). `RarimoMaciGate.sol` verifies a TD3 proof against the canonical Rarimo registry and a pinned Groth16 verifier. It requires a Ukrainian citizenship code, age at least 18, a valid passport expiration bound, a current proof date, an election-specific nullifier, and proof data bound to the voter's MACI public key and election-scoped opaque account commitment. A repeated nullifier or key cannot register again. The browser requests the proof through RariMe and submits it to Express, which relays the registration and reconciles the MACI signup event. No passport scan or birth date is stored in MongoDB. The public chain records the nullifier, citizenship code, and MACI public key. The trusted MACI coordinator can decrypt vote messages; the public cannot read individual choices.

To operate it, deploy the official `TD3QueryProofVerifier`, `RarimoMaciGate`, the gate-only MACI signup policy, and a compatible MACI v3 poll on Rarimo L2. Set the backend-only `RARIMO_RPC_URL`, `RARIMO_SIGNER_PRIVATE_KEY`, `RARIMO_REGISTRY_ADDRESS`, `RARIMO_VERIFIER_CODE_HASH`, `RARIMO_GATE_ADDRESS`, `RARIMO_GATE_CODE_HASH`, and `RARIMO_POLICY_CODE_HASH`, then configure the draft poll in `/admin` using chain ID `7368`. The registry address from [Rarimo's contract reference](https://docs.rarimo.com/zk-passport/contracts/) is `0x479F84502Db545FA8d2275372E0582425204A879`. Pin the runtime bytecode hashes after independent inspection; a lookalike verifier, gate, or policy would invalidate eligibility. The QR flow currently uses RariMe's public verificator for proof delivery. The contract performs the actual proof check. See [the private voting decision](docs/PRIVATE_VOTING_DECISION.md) for deployment commands and test requirements.

No Rarimo L2 poll has been deployed from this repository and no real Ukrainian passport proof has been exercised here. The full MACI coordinator and tally sequence remains an external integration step. Keep the fictional-election and mock labels for legacy elections; a source-code check alone does not establish a live verified election.

## Ubuntu VPS deployment without Docker

The [VPS deployment guide](docs/VPS_DEPLOYMENT.md) installs the frontend, API, Redis, blockchain outbox worker, and Caddy on one Ubuntu VPS. `https://freedomsword.org` serves the frontend and routes same-origin `/api/*` to the private API; `https://api.freedomsword.org` also serves the API over HTTPS. The API's port 3001 is private and uses loopback HTTP behind Caddy. The guide includes the build, systemd services, DNS cutover, health checks, and Telegram checks. Vercel is not required for this deployment.

## Vercel and Telegram release (alternative)

For an Atlas IP allowlist that must stay restricted, keep the frontend on Vercel and run the backend on a server with a fixed outbound IPv4 address. The Docker Compose, HTTPS, outbox-worker, and frontend-switch steps are in [Fixed-IP backend deployment](docs/FIXED_IP_BACKEND.md). Do not point the Mini App at the server; its URL remains the frontend's Vercel URL.

The fixed-IP Compose deployment includes private Redis for two-second public election caching, distributed rate limiting, and BullMQ wake-up jobs for the Sepolia outbox. Every accepted cast or recall is committed to MongoDB with its audit and outbox records before the API replies. Redis is not a ballot ledger: if it restarts, the worker resumes from the MongoDB outbox. The API uses `OUTBOX_PROCESSING=worker` only with a continuously running worker; the Vercel backend keeps the default `inline` mode. The backend connects to Sepolia through `BLOCKCHAIN_SEPOLIA_RPC_URL`, an external HTTPS RPC endpoint; it does not run a blockchain node.

Deploy two Vercel projects from this repository with root directories `backend` and `frontend`. The backend build bundles the Express app into `backend/dist/application.js`; `backend/index.js` exports that bundle through Vercel's Express preset, and `backend/vercel.json` retains the outbox cron. Deploy the backend first and set the frontend's `BACKEND_URL` to the backend's HTTPS origin without a trailing slash. The frontend rewrites same-origin `/api/*` to that URL. Set backend `APP_ORIGIN` to the frontend's exact public HTTPS origin. Keep backend credentials entirely out of the frontend project. Configure these variables for the intended environment, including at build time:

To point the frontend at a specific backend locally, set `BACKEND_URL="https://api.example.com"` in the ignored `frontend/.env` file and restart Next.js. Use the backend's public origin only: no `/api` path or trailing slash. The variable is server-only, so do not prefix it with `NEXT_PUBLIC_`.

For the deployed frontend, open the **frontend** project in Vercel and go to **Settings → Environment Variables**. Set `BACKEND_URL` for Production (and Preview if needed) to the same backend origin, and set `APP_ENV=production` for a production deployment. Your local `.env` file is not uploaded to Vercel. Save the variables and redeploy the frontend; an existing deployment does not pick up changed environment variables.

The backend must be reachable at `https://api.example.com/api/ready`, and its `APP_ORIGIN` must equal the frontend's public origin. After redeploying, open `https://<frontend-domain>/api/ready`: an `ok` response confirms that the frontend proxy reaches the configured backend. `https://<frontend-domain>/api/elections` should then return the backend's elections. Each Vercel deployment uses one configured backend; visitors cannot change it in the browser.

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

Deploy the contract first with `npm run contract:deploy:sepolia` using a funded testnet account. This command spends testnet ETH and prints its address and deployment block; set both in the backend environment. The current Sepolia contract details are recorded in [docs/SEPOLIA_DEPLOYMENT.md](docs/SEPOLIA_DEPLOYMENT.md). Deploy both apps, run `npm run db:push` and `npm run db:seed` against the chosen Atlas database once, then confirm the frontend's `/api/ready`, `/elections`, and a fresh Telegram launch with a second account. Check cast, recall, and mined contract transactions before changing the bot's Mini App menu and Main Mini App settings to the **frontend** URL. A temporary Cloudflare tunnel remains temporary and is not a public deployment.

Vercel does not run `npm run outbox:worker` continuously. Each successful backend write attempts a bounded outbox flush and reconciliation; authenticated `POST /api/blockchain/retry` can process another batch. `backend/vercel.json` schedules an authenticated backend `/api/cron/outbox` run once per day, which is compatible with the [Vercel Hobby minimum interval](https://vercel.com/docs/cron-jobs/usage-and-pricing). Vercel adds the `CRON_SECRET` bearer header for scheduled calls as described in its [cron security guide](https://vercel.com/docs/cron-jobs/manage-cron-jobs). Pending, submitted, and confirmed are distinct states. Failed contract actions require investigation and reconciliation; a MongoDB commit and an Ethereum transaction are not atomic.

## Data and trust boundaries

The [24 October client corrections](docs/CLIENT_UPDATES_2026-10-24.md) add a `CONTINUOUS_SUPPORT` mode for new elections: a 100-unit budget, arbitrary whole-unit allocations and recalls, and reuse six calendar months after each withdrawal. Existing legacy ballots retain their published rules. This new mode is enforced by MongoDB transactions; only its audit commitments are anchored on-chain. Run `npm run db:seed:support` after applying the Prisma schema to add its separate fictional demonstration. The same guide covers the separate feedback bot, broader sharing, bot welcome copy and wallet decision.

MongoDB stores accounts, sessions, eligibility records, ballots, audit events, and outbox state. Multi-document transactions and unique indexes enforce the app's ballot workflow. The contract enforces one 100-unit ballot per opaque nullifier, immutable recall policy, remaining balance, delays, operation limits, and election windows. Its public storage and events reveal each nullifier's cast and recall timing, balance changes, and a salted choice commitment. Candidate membership and person eligibility remain server-side checks. Generic audit actions are anchored by commitment. MongoDB is the application ledger; Ethereum is an eventual, independently visible mirror. An administrator with database write access can alter records, and the relayer controls submissions. Do not claim a secret ballot or production-grade decentralized election.

The current `ELIGIBILITY_PROVIDER=mock` verifies no real person for legacy elections and does not prevent one person from using multiple Telegram accounts. The separate Rarimo/MACI path is implemented in code but requires deployment and live proof testing. Keep fictional/demo labeling visible for the legacy experience.

The selected private-election architecture uses Rarimo-only eligibility and MACI encrypted voting with a trusted coordinator. The registration, encrypted-message, and tally-import paths are implemented but are not deployed as a live election. Existing ballots and live aggregates must not be relabeled as private. See [the private voting decision](docs/PRIVATE_VOTING_DECISION.md).

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), [CONTRACT.md](CONTRACT.md), [SECURITY.md](SECURITY.md), and [RECOVERY.md](RECOVERY.md) for implementation and operations. Telegram Mini App validation follows the [official Telegram specification](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app); MongoDB transaction setup follows [Prisma's MongoDB guide](https://www.prisma.io/docs/orm/v6/overview/databases/mongodb).
