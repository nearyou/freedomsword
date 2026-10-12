# Security design and limitations

## Authentication and authorization

The server validates raw Telegram Mini App `initData` with Bot API HMAC, bounded age and a one-time replay digest. Signed, expiring HTTP-only sessions carry an internal user ID/version. Every write checks the exact configured Origin, input shape, session, and action-specific rate limit. The browser's `initDataUnsafe` is never an authorization source. Production rejects demo authentication and requires HTTPS, MongoDB-backed rate limits, and the Sepolia adapter.

The mock eligibility provider confirms no real-world identity. Its random per-user subject cannot prevent one person using multiple Telegram accounts. Agreement acceptance records app consent and a document hash, not a legally binding digital signature. A future identity provider must be reviewed for uniqueness, privacy, error cases, and Telegram-to-person binding before any real election use.

## Data and audit integrity

MongoDB transactions and unique indexes protect normal concurrent cast/recall paths. They do not prevent a database operator from changing or deleting stored evidence. The audit hash chain and `npm run audit:check` are detection tools; an operator who rewrites the entire database can compute a new internal chain. An independently observed Sepolia contract event or retained backup can expose that rewrite. The outbox sends salted audit commitments and, for voting actions, opaque election keys, nullifiers, candidate commitments and recall modes. A `SUBMITTED` hash is not a mined receipt; `CONFIRMED` means the adapter observed a successful matching transaction. Sepolia is still subject to chain reorganizations and relayer control. Public observers can link a nullifier's cast and recall timing.

Identity and ballot records are separated, but the private credential and HMAC key permit correlation. Do not claim secret voting, coercion resistance, one-person-one-vote, or official election security. Keep `BALLOT_SECRET` and `ELIGIBILITY_COMMITMENT_SECRET` stable while related records exist. Rotation requires a planned data migration.

The Sepolia relayer key, Atlas URI, Telegram bot token, cron bearer secret and three application secrets must stay in server-only environment variables. Rotate the Atlas password previously shared in chat before public deployment. Fund the relayer with testnet ETH only. Scope Atlas privileges and network access, back up regularly, and keep independently witnessed audit roots. A lost relayer requires owner-controlled rotation and outbox reconciliation. A lost database key or credential is handled using the recovery plan.

## Release boundary

This is a fictional-election MVP, not a binding public voting system. Real identity verification, an independent smart-contract audit, strong key custody, unbiased candidate/election administration, accessibility and abuse review, privacy review, penetration testing, and operational incident response remain release gates. The contract validates per-nullifier units and recall rules but does not authenticate people or publish candidate totals.

Operational logs use fixed action/outcome/error labels and request UUIDs; they must never include Telegram `initData`, cookies, bot tokens, keys, credentials, ballot pseudonyms, request bodies or raw caught errors. `/api/ready` exposes only dependency status. Browser QA and unit/integration/build checks should precede each public deployment.
