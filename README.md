# FreedomSword

A Telegram Mini App MVP for fictional, continuously recallable elections. One ballot starts with 100 units; citizens can recall 25 units at a time or their entire remaining balance. This is a demonstration, not an election-ready system.

## Stack and quick start

Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma, Zod, Recharts and Vitest. Node.js 22.12+ is recommended.

1. `npm install`
2. Copy `.env.example` to `.env` and configure PostgreSQL and secrets. `docker compose up -d` supplies a local PostgreSQL instance if Docker is installed.
3. `npm run db:generate && npm run db:migrate && npm run db:seed`
4. `npm run dev`, then open http://127.0.0.1:3000.
5. `npm run check` runs TypeScript, ESLint and Vitest.

The interface includes a clearly labeled local demo entry point. Demo authentication requires `ALLOW_DEMO_AUTH=true` and is disabled in production. Telegram deployments require HTTPS, a bot token and the exact `APP_ORIGIN`. Launch the URL from your bot's Mini App menu; the browser submits the raw `initData` to the server.

## Local PostgreSQL without Docker

Run `npm run db:local` in a separate terminal. This starts PostgreSQL on **127.0.0.1:55432**, stores its data inside `.local-postgres`, and creates `.env` with random development secrets if the file does not already exist. It never overwrites an existing `.env`; point `DATABASE_URL` to the local cluster yourself if you already configured another database. Keep the process running while using the app. Then run the generation, migration, seed and development commands above.

The local demo account is shared across browser sessions. It has one ballot per election and fully recalled ballots stay consumed. Browser QA left a fully recalled City Council ballot and one Maya Chen platform endorsement in this local development database; the other two elections are available for new demo ballots. Isolated automated tests never modify the demo database.

## Commands and behavior

- `npm run check`: TypeScript, TypeScript/React Hooks/accessibility lint, and unit/security tests.
- `npm run test:integration`: creates a uniquely named temporary database on localhost, migrates, seeds, tests real transactions, then removes only that test database. The configured database user needs CREATE DATABASE permission.
- `npm run phase -- 14`: runs TypeScript, lint and unit tests for a named phase and records success in TASKS.md. PostgreSQL integration, Prisma generation and the production build are separate commands.
- `npm run build && npm start`: production build/server. Demo login and demo sessions are rejected in production.

Next.js uses Webpack here because Windows blocked Turbopack's persistence-file rename. Filesystem compiler caching is disabled on Windows. Prisma uses its PostgreSQL JavaScript adapter and `engineType = "client"`; run generation explicitly if your package manager blocks install scripts.

Live results poll every eight seconds while the page is visible. Search matches full names case-insensitively. All election types use the same one-ballot rule. Endorsements bind authenticated consent to the exact platform text/version with a private hash commitment; wallet signatures are outside this MVP.

Appearance follows Telegram's light/dark setting inside the Mini App and the device setting in a browser. The appearance control cycles through System, Light, and Dark; a manual choice is saved in local browser storage.

Mock blockchain receipts are processed after successful writes. If processing fails, the committed action is preserved. Authenticated `POST /api/blockchain/retry` with an empty JSON object retries up to ten records (five attempts per record). It requires the configured Origin and session cookie. An optional `npm run outbox:worker` processes the same commitment-only queue with expiring leases. There is no external broadcast.

## Telegram and staging setup

1. Create a bot with BotFather and keep its token in the server's environment. Deploy this Next.js **Node server** and PostgreSQL behind a public HTTPS URL. Do not use static export.
2. Set `APP_ENV=staging`, `DATABASE_URL`, `APP_ORIGIN` and `NEXT_PUBLIC_APP_URL` to the same exact HTTPS origin (no trailing slash), `TELEGRAM_AUTH_ENABLED=true`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_AUTH_MAX_AGE_SECONDS=300`, `SESSION_MAX_AGE_SECONDS=21600`, `ELIGIBILITY_PROVIDER=mock`, `RATE_LIMIT_BACKEND=postgres`, and `ALLOW_DEMO_AUTH=false`. Generate **three different** random secrets of at least 32 characters for `SESSION_SECRET`, `BALLOT_SECRET`, and `ELIGIBILITY_COMMITMENT_SECRET`. See `.env.example`; do not copy its placeholder values into a deployment.
3. Run `npm ci`, `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run build`, and `npm start` on the host. Set the same environment for build and runtime. `/api/health` checks the process; `/api/ready` checks PostgreSQL.
4. Set the bot's Mini App menu URL in BotFather to the HTTPS app URL. Open it from Telegram, connect, sign out, reopen it, and verify session expiry and cookie behavior on target clients. A consumed Telegram `initData` hash cannot be exchanged twice; reopen the Mini App to obtain fresh data. No live Telegram launch has been performed in this workspace.

The interface detects a missing Telegram launch, script load failure, expired sign-in and replayed sign-in and shows an actionable authentication state. The server always verifies the raw signed `initData`; browser-reported user fields never authorize a session. Do not put the bot token in a `NEXT_PUBLIC_` variable. Keep `ALLOW_DEMO_AUTH=false` in staging and production; local demo sign-in is available only with `APP_ENV=development`, `NODE_ENV=development`, and explicit `ALLOW_DEMO_AUTH=true`. Telegram client validation requires an operator-provided bot token and reachable HTTPS host, so it cannot be completed on localhost alone.

Staging builds use `.next-staging`, separate from the local development server's `.next` directory. A temporary Cloudflare Quick Tunnel can supply HTTPS for a client test, but its URL changes when the tunnel restarts; update `APP_ORIGIN`, `NEXT_PUBLIC_APP_URL`, rebuild, and update the bot menu after each change. Keep staging on an isolated database with demo login disabled. The bot's chat menu is configurable through the Telegram Bot API; its profile Main Mini App is configured separately in BotFather.

For the existing local Telegram staging setup, run `npm run telegram:staging` and keep it running. The command reads the ignored `.env.telegram-staging`, requires the isolated `dd_telegram_staging` database on localhost:55432, starts local PostgreSQL if needed, applies pending migrations, and creates a Cloudflare Quick Tunnel to port 3001. Install `cloudflared` on PATH or set `CLOUDFLARED_PATH`; Windows also detects the existing `cloudflared-freedomsword.exe` in the temporary directory. It updates only the two origin settings in the staging environment file, rebuilds with the new HTTPS origin, starts the app, and verifies the public home, database readiness, elections, logo and client bundle before setting the bot display name and chat menu to FreedomSword and confirming both settings. It preserves the development `next-env.d.ts` references. Progress and the current address are saved without secrets in `artifacts/telegram-staging-status.json`. Stop an existing staging process before running the command again. This supplies a temporary test connection: closing its process, shutting down the computer, or a failed dependency makes the app unavailable. A permanent deployment requires an always-on host and stable HTTPS address.

Next.js validates configuration during Node server startup. Staging and production require HTTPS and explicit auth/session ages. Production also requires Telegram authentication and disables demo sign-in. `NEXT_PUBLIC_APP_URL` is public and must equal `APP_ORIGIN`; bot and key secrets are server-only. Production cookies use Secure, HttpOnly, a `__Host-` prefix, SameSite=None and Partitioned. Exact Origin checks protect writes. The authentication cookie lasts for the configured session age, and signing out revokes it server-side.

`ELIGIBILITY_PROVIDER=mock` preserves development/staging behavior. A real provider can implement `EligibilityProvider` and be registered in the factory, returning an election-appropriate unique subject ID and an eligibility decision. The current mock proves no real-world eligibility. `RATE_LIMIT_BACKEND=postgres` shares counters across app instances; `memory` is for local development only.

For local development, the existing `npm run db:local` helper creates a usable `.env` only if one does not exist. Older local `.env` files can omit the new settings in development; the defaults are documented in `.env.example`. Existing ballots migrate lazily to election-specific credentials when their owner next casts or recalls; `/api/me` can read legacy ballots before that. Keep `BALLOT_SECRET` stable while those ballots exist. No ballots or audit records are rewritten.

## Validation

The original 14 phases and continuation phases passed TypeScript, ESLint and Vitest. Fresh PostgreSQL integration, Prisma generation and staging-configured build results are recorded after each continuation phase in TASKS.md.

See ARCHITECTURE.md, DATABASE.md, SECURITY.md, PRIVACY.md and TASKS.md for design, limitations and progress. No production blockchain or Rarimo integration is included.

For database backup, migration failure, audit verification, outbox recovery and key rotation procedures, see [RECOVERY.md](RECOVERY.md). `npm run audit:check` is a read-only consistency check over the current database.

## Election manager setup

After an operator has signed in through Telegram, run `npm run admin:grant -- <numeric Telegram ID>` from a trusted deployment shell to assign the `ELECTION_MANAGER` role. No account is hardcoded. The role is stored in PostgreSQL and checked on every `/api/admin/elections` request. Visit `/admin` to create a draft election, edit its dates/type, add or withdraw candidates, add immutable platform versions and promises, activate, close, or archive it. Management actions append commitments to the audit chain. The manager API returns election configuration only, never voter or ballot records. A manager grant is an operator action; protect shell/database access.

Election states are `DRAFT`, `UPCOMING`, `ACTIVE`, `FINISHED`, and `ARCHIVED`. Activation schedules a future election as `UPCOMING` or immediately starts one within its window. Public reads derive the current state from server time; vote/recall transactions take an election row lock and use PostgreSQL time. The start is inclusive, the end is exclusive. A vote/recall may finish after the advertised end only if its final in-transaction database-time check occurred before the end; a request whose final check finds the end passed rolls back. Managers can archive a finished election but cannot edit its configuration.

Unpublished drafts with no ballots remain editable after their scheduled start, so managers can reschedule a missed window. Activation after the opening time is allowed until the closing time; an expired draft must be rescheduled first. Archiving an election that ended by time persists its `FINISHED` transition and then `ARCHIVED` in the same locked transaction.

Migrations 012–013 enforce that configuration, candidates, platform versions and promise titles cannot be changed through direct database writes after a draft is activated, including a write racing with activation. Promise progress and evidence can still be updated. Legal lifecycle transitions are enforced in PostgreSQL. The seed creates draft fixtures first, adds candidates and platforms, then activates them.

Managers can set an election's recall policy while it is still a draft: enable/disable recall, full and partial modes, integer partial amount, first-recall delay, cooldown and optional maximum operation count. The default remains 25-unit partial recall (`100 → 75 → 50 → 25 → 0`), with no delays or count limit. Every policy decision is checked inside the vote transaction; the public election response and voter confirmation show the configured rules. A partial recall that exceeds the remaining balance is rejected; an enabled full recall may remove the remainder.

Each activated election has a public `/elections/<id>/transparency` page and `/api/elections/<id>/transparency` JSON endpoint. They show election configuration, candidates, all platform version hashes, aggregate ballots/units, recent election-scoped audit commitments and mock commitment status. No session is required. The page excludes Telegram IDs, internal user IDs, credential tokens, ballot pseudonyms and individual vote events. Historical audit records created before migration 010 are still available in the global `/api/audit` chain because their election association cannot be retroactively written into immutable evidence.

`GET /api/elections/<id>/audit-export` returns a public, versioned JSON envelope, limited to 20 exports per election per minute. Its `sha256` is the SHA-256 digest of the canonical, recursively key-sorted JSON `bundle` (the hash field itself is outside the hashed data). Save the response as a JSON file and run `npm run audit:verify -- <file>` to recalculate the hash, validate the complete global public chain and check aggregate arithmetic. The bundle includes election configuration, candidates, all platform hashes/versions, aggregates, election-scoped commitments, the global chain, mock commitment status and generation time. It contains no voter/ballot mappings. The hash proves the downloaded file has not changed; authenticity still requires a trusted source or independently witnessed root hash.

For multiple web instances, set `RATE_LIMIT_BACKEND=postgres` (the staging `.env.example` uses this), run migration 011, and start one or more `npm run outbox:worker` processes alongside the web server. The PostgreSQL limiter atomically shares windows across instances; stale counters should be pruned during database maintenance. Telegram replay digests and vote request IDs already use unique database keys; the new store interfaces make their persistence swappable. Outbox workers claim commitments with expiring leases and conditional completion so a stalled worker cannot overwrite a newer claim. Mock receipts are deterministic, so retry after a lease expiry is safe. This remains a mock blockchain adapter; no real chain broadcast is performed.

Operations return an `X-Request-ID` UUID and emit structured `operation` log events with fixed action/outcome/error-category labels. No raw request data enters those events. An election manager can inspect process-local counters at `GET /api/admin/metrics`; aggregate structured logs centrally for multi-instance metrics. `/api/ready` reports only database and schema availability. Bot tokens, cookies, raw Telegram `initData`, voter identifiers, eligibility documents, private credential tokens, ballot secrets and request bodies must never be written to logs. Follow the deployment log-retention policy for correlation IDs and aggregate counts.

## Implementation references

Authentication follows the [Telegram Mini Apps validation specification](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app). Transactions follow [Prisma's serializable transaction guidance](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions). The project uses Prisma 6's stable schema/client API and Next.js 16's App Router.
