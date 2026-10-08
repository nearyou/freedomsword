# Phased implementation

Before code: README, architecture, database, security, privacy and this task list created. Each phase must run `npm run check` (TypeScript → ESLint → Vitest), repair failures and record the result before continuing.

| Phase | Deliverable | Status |
| --- | --- | --- |
| 1 Setup | Next.js, TypeScript, Tailwind, lint/test configs, health baseline | Complete |
| 2 Database | Prisma models, migration constraints/triggers, seed | Complete |
| 3 Telegram auth | HMAC validation, session cookies, local demo gate | Complete |
| 4 Verification | Provider interface, mock verification, agreement signing | Complete |
| 5 Elections/candidates | Aggregate listing, full-name search, profiles | Complete |
| 6 Voting | Transactional unique +100 cast | Complete |
| 7 Recall | Transactional partial/full recall, idempotency | Complete |
| 8 Dashboard | Mobile dark UI, Recharts, polling, private balance | Complete |
| 9 Candidate platforms | Versioned content, digital endorsements | Complete |
| 10 Promise tracking | Progress/status/evidence UI | Complete |
| 11 Audit log | Append-only chain, public safe projections | Complete |
| 12 Blockchain adapter | Mock commitment outbox and retry | Complete |
| 13 Testing | Integration, race, rollback and build checks | Complete |
| 14 Security review | Privacy/auth review, fixes, limitations | Complete |

## Check log

Production blockchain and Rarimo/ZK remain out of scope. All implementations use the mock adapters described in the architecture.

Phase 1: TypeScript, ESLint and Vitest passed (2026-10-07T15:15:10.089Z).

Phase 2: TypeScript, ESLint and Vitest passed (2026-10-07T15:28:22.742Z).

Phase 3: TypeScript, ESLint and Vitest passed (2026-10-07T15:31:06.711Z).

Phase 4: TypeScript, ESLint and Vitest passed (2026-10-07T15:32:39.216Z).

Phase 5: TypeScript, ESLint and Vitest passed (2026-10-07T15:33:45.756Z).

Phase 6: TypeScript, ESLint and Vitest passed (2026-10-07T15:34:49.063Z).

Phase 7: TypeScript, ESLint and Vitest passed (2026-10-07T15:35:25.214Z).

Phase 8: TypeScript, ESLint and Vitest passed (2026-10-07T15:42:36.830Z).

Phase 9: TypeScript, ESLint and Vitest passed (2026-10-07T15:44:50.257Z).

Phase 10: TypeScript, ESLint and Vitest passed (2026-10-07T15:46:39.146Z).

Phase 11: TypeScript, ESLint and Vitest passed (2026-10-07T15:48:12.840Z).

Phase 12: TypeScript, ESLint and Vitest passed (2026-10-07T15:49:25.691Z).

Phase 13: TypeScript, ESLint and Vitest passed (2026-10-07T15:58:11.943Z).

Phase 14: TypeScript, ESLint and Vitest passed (2026-10-07T16:15:42.798Z).

## Original 14-phase validation (historical)

- 29 unit/security tests and 16 isolated PostgreSQL integration tests pass, including concurrent casts/recalls, transaction rollback, idempotency, public data projections and direct SQL integrity attempts.
- Production build and Prisma generation pass. Dependency audit reports zero known vulnerabilities, including development dependencies.
- Browser QA covers onboarding, agreement signing, casting, partial/full recall, platform endorsement, promise tracking and public audit inspection. Desktop and 390/320-pixel mobile layouts were inspected without horizontal overflow; final browser error logs are empty.
- Screenshots are saved in `artifacts/desktop.jpg` and `artifacts/mobile-audit.jpg`. The local demo is available at http://127.0.0.1:3000 while the development server runs.
- Live Telegram launch requires the user's bot token and HTTPS configuration; it has not been exercised against Telegram. Verification and blockchain remain explicit mocks.

Phase 14: TypeScript, ESLint and Vitest passed (2026-10-07T16:23:49.608Z).

## Next-stage development (2026-10-08)

| Feature | Implemented |
| --- | --- |
| Production Telegram auth | Configurable auth age, malformed/signature/stale checks, one-time replay digest, expiring secure session settings, logout and stable error codes |
| Eligibility architecture | Configurable provider factory, mock provider, validated results, duplicate subject commitment, timeout/retry handling and decision audit |
| Credential separation | Immutable random token per election, ballot pseudonym from credential, legacy ballot fallback/binding, preserved vote and recall constraints |
| Production configuration | Startup validation for PostgreSQL/HTTPS URLs, secrets, provider, auth mode and environment-specific settings |
| Rate limits | Replaceable store interface, per-action user limits and global authentication limit with 429 responses |
| Health/readiness | Minimal process and PostgreSQL endpoints |

Original tests remain; new tests cover configuration, auth edge cases, provider outcomes, credential issuance and legacy migration, endpoint privacy, replay, rate limits, logout, and health/readiness. Live Telegram and real eligibility remain deployment work. Existing ballot and audit migrations were preserved; migrations 004, 005 and 006 were added.

## Next-stage validation

- TypeScript and ESLint passed; Vitest passed **57 unit/security tests** across 15 files.
- PostgreSQL integration passed **22 tests** on a fresh, isolated database using all six migrations, including the existing concurrent vote/recall and rollback cases.
- Prisma client generation and deployment of migrations 004, 005 and 006 to the local development database passed.
- The optimized Next.js production build passed with explicit staging build settings. `npm audit --audit-level=low` reported **0 vulnerabilities**.
- Local development smoke checks returned HTTP 200 for `/`, `status: ok` for `/api/health`, and `status: ok` for `/api/ready` against PostgreSQL.
- Actual BotFather setup, HTTPS staging deployment, real Telegram client authentication, distributed rate limiting, and an independent privacy/security assessment remain outside this local implementation.

## Next-stage file manifest

- Configuration and local setup: `.env.example`, `scripts/local-db.mjs`, `src/instrumentation.ts`, `src/server/config.ts`.
- Identity and voting services: `src/lib/telegram.ts`, `src/lib/session.ts`, `src/server/auth.ts`, `src/server/eligibility.ts`, `src/server/verification.ts`, `src/server/credentials.ts`, `src/server/voting.ts`, `src/server/rate-limit.ts`, `src/server/http.ts`, `src/server/errors.ts`.
- Routes and interface: `src/app/api/auth/route.ts`, `src/app/api/logout/route.ts`, `src/app/api/me/route.ts`, `src/app/api/verify/route.ts`, `src/app/api/agreement/route.ts`, `src/app/api/vote/route.ts`, `src/app/api/recall/route.ts`, `src/app/api/platform/sign/route.ts`, `src/app/api/health/route.ts`, `src/app/api/ready/route.ts`, `src/components/DemocracyApp.tsx`.
- Database: `prisma/schema.prisma`, migrations `202610080004_auth_credentials`, `202610080005_credential_integrity`, `202610080006_identity_commitment_integrity`.
- Tests: `tests/auth.test.ts`, `tests/config.test.ts`, `tests/eligibility.test.ts`, `tests/rate-limit.test.ts`, `tests/rate-limited-route.test.ts`, `tests/health.test.ts`, `tests/security.test.ts`, `tests/voting.integration.test.ts`.
- Documentation: `README.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `PRIVACY.md`, `TASKS.md`.

## Phases 15–24 (2026-10-08)

| Phase | Deliverable | Status |
| --- | --- | --- |
| 15 Real Telegram staging | Bot/environment setup, HTTPS launch handling, safe auth errors/logging | Temporary HTTPS bot menu connected; live client acceptance pending |
| 16 Admin election management | Role-based protected management, audited changes | Complete |
| 17 Election lifecycle | DRAFT → UPCOMING → ACTIVE → FINISHED → ARCHIVED, server-side enforcement | Complete |
| 18 Configurable recall policy | Per-election transactional recall controls | Complete |
| 19 Public transparency | Read-only election metadata, tallies and commitments | Complete |
| 20 Audit export | Safe versioned JSON export and SHA-256 verifier | Complete |
| 21 Distributed abstractions | Rate limit, replay, idempotency and outbox interfaces | Complete |
| 22 Monitoring | Structured safe logging, correlation and metrics | Complete |
| 23 Recovery plan | Backups, migrations, chain/outbox and secret rotation runbooks | Complete |
| 24 Regression suite | Security, privacy, race and tampering tests | Complete |

Each phase requires `npm run check`, `npm run test:integration`, `npm run db:generate`, and `npm run build`; record results here. Production blockchain and Rarimo remain out of scope.

Phase 15: TypeScript, ESLint, 59 Vitest unit/security tests, 22 isolated PostgreSQL integration tests, Prisma generation and staging-configured production build passed (2026-10-08). No bot token or public HTTPS host was supplied, so real Telegram client acceptance remains an operator deployment check. The staging setup and limits are documented in README.md.

Phase 16: TypeScript, ESLint, 59 Vitest unit/security tests, 23 isolated PostgreSQL integration tests, Prisma generation and staging-configured production build passed (2026-10-08). The `/admin` interface and role-checked API support the listed management actions; a trusted operator assigns the role with `npm run admin:grant -- <Telegram ID>`. Migration 007 adds role grants, candidate withdrawal, and lifecycle enum values without altering earlier migrations.

Phase 17: TypeScript, ESLint, 61 Vitest unit/security tests, 25 isolated PostgreSQL integration tests, Prisma generation and staging-configured production build passed (2026-10-08). Migration 008 maps old statuses to the strict lifecycle. Window checks use PostgreSQL epoch time and UTC column comparison to avoid adapter timezone conversion; a final in-transaction check rejects an action if the end has arrived. Concurrent close/cast and boundary tests pass.

Phase 18: TypeScript, ESLint, 63 Vitest unit/security tests, 26 isolated PostgreSQL integration tests, Prisma generation and staging-configured production build passed (2026-10-08). Migration 009 adds recall policy columns and integer-unit SQL bounds. Admins can configure policy only in drafts; the voter UI displays it, and the transaction checks modes, delay, cooldown, amount and operation count. Defaults preserve four 25-unit partial recalls.

Phase 19: TypeScript, ESLint, 63 Vitest unit/security tests, 27 isolated PostgreSQL integration tests, Prisma generation and staging-configured production build passed (2026-10-08). Migration 010 scopes future audit events to elections. The public page/API expose configuration, all platform version hashes, aggregates and tagged commitments; privacy tests ensure account, credential and ballot identifiers stay absent. Historical events remain in the global chain.

Phase 20: TypeScript, ESLint, 65 Vitest unit/security tests, 27 isolated PostgreSQL integration tests, Prisma generation and staging-configured production build passed (2026-10-08). The public audit-export route produces a versioned, safe JSON bundle and canonical SHA-256 envelope; the CLI verifier checks its hash, full global chain links and aggregate arithmetic. The hash is an integrity check for the downloaded file, not independent proof of source authenticity.

Phase 21: TypeScript, ESLint, 66 Vitest unit/security tests, 29 isolated PostgreSQL integration tests, Prisma generation and staging-configured production build passed (2026-10-08). Migration 011 adds shared PostgreSQL rate-limit counters and expiring outbox leases. Telegram replay and vote idempotency have store interfaces backed by existing unique database keys. An optional worker processes mock commitments without Redis; concurrent counter/lease tests pass.

Phase 22: TypeScript, ESLint, 68 Vitest unit/security tests, 29 isolated PostgreSQL integration tests, Prisma generation and staging-configured production build passed (2026-10-08). Responses carry `X-Request-ID`; fixed-label logs and manager-only process metrics cover auth, voting, recall and outbox outcomes. Readiness checks PostgreSQL and required schema. Tests reject untrusted log labels and prevent sensitive request data from entering operational logs.

Phase 23: TypeScript, ESLint, 68 Vitest unit/security tests, 30 isolated PostgreSQL integration tests, Prisma generation and staging-configured production build passed (2026-10-08). `RECOVERY.md` covers encrypted PostgreSQL backups, isolated restore rehearsals, migration failure response, audit/outbox checks, interrupted elections and key rotation. The read-only `npm run audit:check` verifies the local database's chain, ballot sums and platform hashes; no automated recovery or evidence deletion was added.

Phase 24: TypeScript, ESLint, 68 Vitest unit/security tests, 32 isolated PostgreSQL integration tests, Prisma generation and staging-configured production build passed (2026-10-08). Migrations 012–013 freeze activated election configuration, candidate records, platform creation and promise titles at the database layer, restrict lifecycle transitions, and serialize direct configuration writes with activation. Regression tests cover direct SQL tampering, a candidate-insert/activation race, unprivileged admin POST, existing ballot and audit integrity, replay, duplicate eligibility, outbox leasing and public privacy. The local seed remained idempotent after migration; `npm run audit:check` passed against the local database, and `npm audit --audit-level=low` found zero vulnerabilities. Live Telegram launch still needs an operator-provided bot and HTTPS host; real eligibility and blockchain integrations remain out of scope.

Telegram staging update (2026-10-08): The supplied token authenticated as `@freedomswordbot`. With the user's approval, its default chat menu was changed from the prior Freedom Sword URL to `Dynamic Democracy` at `https://calm-excluded-recipients-expires.trycloudflare.com/`, and Telegram's `getChatMenuButton` confirmed the new URL. The HTTPS URL is a temporary Cloudflare Quick Tunnel to a production-mode Next.js staging process on port 3001. It uses the isolated `dd_telegram_staging` database, `.env.telegram-staging` (ignored), all 13 migrations, seeded fictional elections, PostgreSQL rate limits and disabled demo login. Public home, readiness and election routes returned 200; malformed signed data returned `AUTH_INVALID`. This is a temporary test connection: the tunnel URL changes when restarted and has no uptime guarantee. The bot's separate Main Mini App profile setting remains under BotFather control. A real Telegram client launch and sign-in have not yet been observed.

Appearance and staging update (2026-10-08): The UI now follows Telegram's light/dark scheme, falling back to the device setting in a browser. A System/Light/Dark control saves manual preference locally and applies the theme to the election, profile, results, admin and transparency views. TypeScript, ESLint, 68 Vitest tests and a staging production build passed. The original Quick Tunnel became unreliable for full-page requests, so staging was rebuilt with `APP_ORIGIN` and `NEXT_PUBLIC_APP_URL` set to `https://arising-trade-ride-sterling.trycloudflare.com/` and the tunnel restarted with HTTP/2 transport. Public home, readiness and elections returned 200. Telegram's `getChatMenuButton` confirmed the bot menu now points to the new URL. A real Telegram client launch and sign-in remain unobserved.

Frontend product refresh (2026-10-08, Asia/Tokyo): Refactored the citizen UI into focused components/hooks, applied a shared responsive navy/blue design system with the approved Freedom Sword brand mark, improved profile/onboarding/confirmation/ballot/results/promise views, and grouped admin actions with review confirmations. Temporary private polling failures preserve the last known ballot; optional private recall counts/timestamps and public platform dates are safe additive read fields. Mutation services, authorization, schema, migrations and existing tests remain intact. TypeScript, ESLint, **75 unit/UI/security tests**, **32 isolated PostgreSQL integration tests**, and the optimized staging-configured build passed. Browser QA covered participation/recall/endorsement/admin flows, private-refresh interruption, audit inspection, and 320/390/820/1440px layouts. Screenshots and detailed changes/limits are recorded in [UI-REFRESH.md](UI-REFRESH.md). Exact matching remains pending the UI layout reference image; the supplied image is the logo.

Telegram availability repair (2026-10-08, Asia/Tokyo): The saved bot menu pointed to an unreachable Quick Tunnel while PostgreSQL, the staging app and cloudflared were stopped. Added `npm run telegram:staging` to restore the isolated database service, apply migrations, obtain a fresh tunnel, preserve secrets while updating staging origins, rebuild, verify public routes/assets, and update/confirm the bot menu. The current chat menu for `@freedomswordbot` points to `https://bufing-cycles-wooden-travesti.trycloudflare.com/`. Public home/readiness/elections/logo and all nine initial JS assets returned 200; browser rendering displayed the refreshed design and live database elections. Demo login returned 403 and malformed Telegram launch data returned `AUTH_INVALID`/401. No server secrets appeared in the downloaded initial client bundles. The connection still requires the computer and background processes to remain running; the separate Main Mini App profile URL remains configured in BotFather, and real Telegram sign-in is not yet observed.

Review regressions repaired (2026-10-08, Asia/Tokyo): Naturally expired elections now persist FINISHED before ARCHIVED within the same locked transaction. Drafts with no ballots can be edited/rescheduled after their original start; activation within the window starts immediately, while expired drafts require rescheduling. The admin UI follows these rules. Telegram login now respects `TELEGRAM_AUTH_ENABLED=false` even when a token is present. TypeScript, ESLint, **76 unit/security/UI tests**, **34 isolated PostgreSQL integration tests**, and the actual Telegram-staging optimized build passed. All 13 migrations and existing evidence guards remain unchanged.
