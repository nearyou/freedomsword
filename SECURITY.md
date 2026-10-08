# Security design and review

## Authentication

Only server-validated raw Telegram initData is trusted. Validate its HMAC-SHA-256 with a bot-token-derived WebAppData key, compare in constant time, reject duplicate fields, require a bounded auth timestamp and a structurally valid user. Never trust initDataUnsafe for authorization. Sessions are HMAC-signed, expire, contain only an internal user ID/version and use HTTP-only cookies. Production uses a __Host prefix, Secure, SameSite=None and Partitioned for embedded browsers; exact Origin validation is required for every write. Production rejects demo accounts even if a signed demo session exists. Bot/session/pseudonym secrets stay server-side.

`TELEGRAM_AUTH_MAX_AGE_SECONDS` and `SESSION_MAX_AGE_SECONDS` are configurable. A unique database digest of the validated Telegram hash rejects repeat exchanges, including reordered query fields; stale data and malformed inputs receive stable error codes without raw values. Logout increments the session version and clears the cookie. Next.js Node instrumentation validates required staging/production settings before serving requests. `NEXT_PUBLIC_APP_URL` is public; bot, ballot and eligibility commitment secrets are server-only. The replay table needs scheduled expiry cleanup at scale; the auth flow also prunes expired rows.

## Authorization and validation

All writes require exact configured Origin, JSON input bounded in size, Zod validation and a valid session (auth exchange is the sole pre-session exception). Voting requires unexpired verification, the current citizen agreement, an open election, and candidate/election membership. Platform signing requires a real platform and verified citizen. The mock verifier proves no real identity or eligibility.

Eligibility decisions use a provider interface with bounded timeout and one retry for transient failures. Invalid responses are not retried; ineligible results are not retried. A keyed commitment of a provider's unique subject ID prevents duplicate identity enrollment without persisting the raw provider response. Once set, the commitment cannot be changed or deleted through ordinary SQL or the service; a changed identity requires manual review. Decision audit payloads are committed as salted hashes; no provider metadata enters public output. Provider errors are normalized. The mock provider's unique subject is only a random per-user key, so it cannot detect one person with multiple Telegram accounts.

Sensitive routes use action-specific per-user limits; auth has a global limit because this project does not assume forwarded IP headers come from a trusted proxy. Public audit exports have a per-election limit. Rate-limit logs include only the action name. The PostgreSQL backend shares limits across server instances; the in-memory backend is for local development. A trusted client-address strategy remains necessary before public scale.

## Integrity

Keep BALLOT_SECRET stable throughout active elections. Rotating it changes election pseudonyms and requires a planned migration that preserves ballot uniqueness. Private eligibility readback uses the configured verification provider and checks the exact current agreement hash, matching mutation authorization.

Serializable transactions and database locks/constraints prevent duplicate casts, over-recall and cross-election candidates. Vote and audit event rows are immutable under ordinary SQL updates. Migrations 012–013 freeze election configuration, candidates, platform versions and promise titles after activation, restrict lifecycle transitions, and lock the election row before a direct configuration write so it cannot race activation. Hash-chain continuity is verifiable; a trusted administrator can rewrite the entire database, so a mock receipt is not external evidence. Only salted commitments enter the mock adapter.

New voting credentials are random, scoped to one election and immutable in PostgreSQL. The ballot stores only the derived pseudonym. The identity-side credential record and server secret can still reconnect an identity to a ballot; no secret-ballot guarantee is claimed. Existing ballot pseudonyms remain unchanged and are bound lazily so historic votes and recalls retain their integrity.

## MVP limitations / release gates

This prototype is unsuitable for binding public elections. Real uniqueness/eligibility, coercion resistance, independent verifiability, operational key custody, accessibility review, external penetration tests, abuse-resistant public traffic controls and independent audit witnesses are release gates. PostgreSQL limits are shared when `RATE_LIMIT_BACKEND=postgres`; local memory limits reset on restart. A validated Telegram initData hash is single-use but can be intercepted before its first exchange; avoid logging it and shorten exposure. Administrative promise updates are not exposed through citizen APIs.

## Validation

Every phase runs TypeScript, ESLint and Vitest. Final review additionally checks production build, public API field allowlists, auth tampering/expiry, transaction race behavior and SQL immutability constraints. Actual results are recorded in TASKS.md.

## Review findings and fixes

- Raw PostgreSQL row-lock conflicts use nested SQLSTATE metadata through the JavaScript adapter. Retry handling covers ORM P2034 and adapter P2010 with 40001/40P01; unrelated failures are not retried.
- SHA-256 link verification and sequence ordering are enforced inside PostgreSQL, including direct insert attempts. Immutable platform versions prevent an endorsement from silently applying to edited text.
- BEFORE TRUNCATE triggers close an append-only table loophole. Outbox commitments are bound to their audit record by a trigger.
- Browser QA found notifications covering profile actions; modal notifications now appear at the top and successful notices expire. Dialogs trap focus, restore focus and lock background scrolling.
- Next.js and Vitest were upgraded to patched releases. A deepmerge-ts override removes the config-stack-exhaustion advisory; Prisma generation/migrations and integration tests validate compatibility. Direct TypeScript, React Hooks and accessibility lint plugins replace the vulnerable glob dependency tree. The final npm audit reports zero known vulnerabilities.

Headers include CSP, nosniff, no-referrer and disabled camera/microphone/location permissions. CSP permits inline Next.js bootstrap scripts/styles; production nonce-based CSP and client compatibility review remain hardening work. Promise metadata is not independently verified. No external penetration test, Rarimo/ZK proof validation or real Telegram launch was performed. Rotate session signing secrets with session invalidation; rotating `BALLOT_SECRET` or `ELIGIBILITY_COMMITMENT_SECRET` requires a migration that preserves existing credentials and uniqueness checks.

Staging authentication logs use a fixed outcome vocabulary only: `SUCCESS`, `INVALID`, `EXPIRED`, `REPLAYED`, or `UNAVAILABLE`. Never log raw Telegram `initData`, cookies, bot tokens, credential tokens, or caught request objects. Client launch failures are displayed locally and do not transmit Telegram launch data to a log sink.

Operational logs carry only timestamp, generated/validated UUID correlation ID, fixed action (`auth`, `vote`, `recall`, `outbox`), success/failure and a fixed error category. They do not include HTTP headers, URL query strings, request bodies, exception messages, account IDs, ballot references or provider details. Manager-only process counters use the same fixed labels; multi-instance metrics require central aggregation of log events. Readiness responses reveal only database/schema availability.
