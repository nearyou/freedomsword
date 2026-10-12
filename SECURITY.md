# Security design and limitations

## Authentication and authorization

The server validates raw Telegram Mini App `initData` with Bot API HMAC, bounded age and a one-time replay digest. Signed, expiring HTTP-only sessions carry an internal user ID/version. Every write checks the exact configured Origin, input shape, session, and action-specific rate limit. The browser's `initDataUnsafe` is never an authorization source. Production rejects demo authentication and requires HTTPS, MongoDB-backed rate limits, and the Sepolia adapter.

The mock eligibility provider confirms no real-world identity. Its random per-user subject cannot prevent one person using multiple Telegram accounts. Agreement acceptance records app consent and a document hash, not a legally binding digital signature. A future identity provider must be reviewed for uniqueness, privacy, error cases, and Telegram-to-person binding before any real election use.

## Data and audit integrity

MongoDB transactions and unique indexes protect normal concurrent cast/recall paths. They do not prevent a database operator from changing or deleting stored evidence. The audit hash chain and `npm run audit:check` are detection tools; an operator who rewrites the entire database can compute a new internal chain. An independently observed Sepolia commitment or retained backup can expose that rewrite. The outbox sends only an opaque salted audit commitment to Sepolia. A `SUBMITTED` hash is not a mined receipt; `CONFIRMED` means the adapter observed a successful matching transaction, but it is still a testnet transaction subject to chain reorganizations and operator control of the signer.

Identity and ballot records are separated, but the private credential and HMAC key permit correlation. Do not claim secret voting, coercion resistance, one-person-one-vote, or official election security. Keep `BALLOT_SECRET` and `ELIGIBILITY_COMMITMENT_SECRET` stable while related records exist. Rotation requires a planned data migration.

The Sepolia signer key, Atlas URI, Telegram bot token, cron bearer secret and three application secrets must stay in server-only environment variables. Rotate the Atlas password previously shared in chat before public deployment. Fund the signer with testnet ETH only. Scope Atlas privileges and network access, back up regularly, and keep independently witnessed audit roots. A lost signer means new commitments cannot be submitted until a replacement and reconciliation plan is made. A lost database key or credential is handled using the recovery plan.

## Release boundary

This is a fictional-election MVP, not a binding public voting system. Real identity verification, audited smart contracts or independent anchors, strong key custody, unbiased candidate/election administration, accessibility and abuse review, privacy review, penetration testing, and operational incident response remain release gates. The Sepolia self-transaction is an external timestamped commitment, not a smart contract vote count.

Operational logs use fixed action/outcome/error labels and request UUIDs; they must never include Telegram `initData`, cookies, bot tokens, keys, credentials, ballot pseudonyms, request bodies or raw caught errors. `/api/ready` exposes only dependency status. Browser QA and unit/integration/build checks should precede each public deployment.
