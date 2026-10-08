# Architecture

## Boundaries

The Next.js client displays elections, candidates, eligibility, personal ballot balances, platform endorsements and aggregate results. Route handlers authenticate sessions, validate Zod inputs and delegate mutations to server services. Prisma owns PostgreSQL persistence. Results refresh by polling, with no public ballot feed.

Identity records contain a Telegram identifier and a random private voter key. An identity-side `VotingCredential` gives each user one random 256-bit token per election. New ballots use an election-scoped HMAC pseudonym derived from that token; `Vote` and `VoteEvent` have no User foreign key. The voting service accepts only this pseudonym, never Telegram identity. Existing ballots keep their old immutable pseudonym and are bound lazily to a credential. The credential and identity reside in the same database, and the server has the HMAC key: an operator can still correlate a ballot with a person. This is separation of services and records, not cryptographic anonymity.

## Services

- Config: validate URLs, key strength, provider choice and environment-specific requirements at Node startup. Staging and production require explicit HTTPS settings.
- Auth: validate Telegram HMAC, reject malformed/stale/future data, use a database-backed one-time replay digest, mint expiring signed HTTP-only sessions and revoke them on logout.
- EligibilityProvider: a configurable factory and normalized result/error boundary. The mock provider remains available; future real providers must supply a stable unique subject ID and carefully handle proof material. Provider metadata and raw responses are never persisted.
- Credential: issue an immutable election-scoped random token after eligibility; derive a ballot pseudonym for voting. Legacy ballots are discovered by their existing pseudonym and bound on the next write.
- Agreement: store exact version, canonical text hash and per-user signature commitment.
- Voting: serializable transactions, election-scoped unique ballot, immutable CAST/RECALL events, guarded balances, conflict retries.
- Audit: append-only global hash chain with advisory transaction lock and salted commitments. No identities, ballot IDs or per-ballot event payloads in public records.
- BlockchainAdapter: mock commitment receipt only; no network broadcast. Records are an outbox with pending/processing/confirmed/failed states, expiring claims and explicit retry.
- Rate limit: replaceable memory and shared PostgreSQL stores with separate action budgets for authentication, verification, voting, recall, agreement, platform signing and audit export.

## Project structure

```
prisma/              schema, migrations, deterministic fictional seed
src/app/             mobile interface and API route handlers
src/components/      client dashboard, candidate and platform views
src/lib/             contracts, hashing, rules, demo data
src/server/          database, auth, eligibility, transactions, audit adapters
tests/               rule, auth, privacy and service tests
scripts/             repeatable validation and integration checks
```

## API shape

GET `/api/elections` returns aggregate election/candidate/platform results. GET `/api/me` returns private eligibility and ballot state, without the credential token. POST `/api/auth` exchanges fresh Telegram initData (or explicitly enabled local demo) for a cookie; POST `/api/logout` revokes and clears it. POST `/api/verify`, `/api/agreement`, `/api/vote`, `/api/recall`, `/api/platform/sign` perform authenticated same-origin actions. GET `/api/audit`, `/api/elections/[id]/transparency` and `/api/elections/[id]/audit-export` expose commitment-only public evidence. POST `/api/blockchain/retry` processes a bounded outbox batch. `/api/admin/elections` and `/api/admin/metrics` require an election-manager role. GET `/api/health` confirms process liveness; GET `/api/ready` checks PostgreSQL and required schema.

## MVP choices

Three election types share one-candidate, 100-unit semantics. A fully recalled vote cannot be cast again. Elections must be open and within their dates for cast/recall. Platform endorsements are separate from ballots. Promise progress is administrator-seeded metadata, not independently verified evidence. A live result is a committed aggregate snapshot; short polling delay is expected.

Election managers are granted an `ELECTION_MANAGER` database role by an operator command after Telegram sign-in. `/admin` calls a role-checked management API. Draft election edits, candidate withdrawals, versioned platforms and promises use serializable transactions and append audit commitments. Withdrawn candidates are retained as records; no ballot or identity joins are returned to managers.

The lifecycle uses `DRAFT → UPCOMING → ACTIVE → FINISHED → ARCHIVED`. Effective state is derived from PostgreSQL/server time on reads and enforced under an election row lock in vote/recall transactions. The final database-time check before commit rejects operations whose election window has ended; an administrative close serializes on the same row lock.

Database triggers guard lifecycle transitions and freeze election configuration, candidate records, platform creation and promise titles after draft activation. Promise progress and evidence remain editable. The seed loads fictional candidates and platforms while elections are drafts, then activates them.

Each election stores a recall policy. `recallVote` reads it under the election and ballot row locks, checks prior immutable recall events for delay/cooldown/count limits, and writes one new negative event plus the balance projection atomically. The public contract exposes the policy before a voter confirms an action.

The transparency service builds a repeatable-read aggregate snapshot from explicit public projections. New audit events carry an election scope; older immutable events remain global. The audit export uses the same snapshot and includes the entire global public hash chain so a standalone verifier can recompute its links and the canonical JSON SHA-256. Neither the page nor export joins identity or ballot pseudonym records.

Multi-instance infrastructure has store interfaces for rate limits, Telegram replay claims, vote idempotency lookup and commitment outbox claims. PostgreSQL supplies shared atomic implementations without Redis. The optional outbox worker polls a bounded batch; claims use 60-second leases and claim tokens to prevent stale workers from finalizing a newer claim. External adapters must be idempotent because a lease can expire after submission but before receipt persistence.
