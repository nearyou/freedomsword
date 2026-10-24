# MongoDB data design

MongoDB Atlas is the only application database. A replica set is required for Prisma's multi-document transactions. `backend/prisma/schema.prisma` defines collections and unique indexes; run `npm run db:push` before using a fresh database. `npm run db:seed` adds fictional candidates and elections without deleting ballots.

| Collection | Purpose |
| --- | --- |
| User, TelegramAuthReplay | Private Telegram account and launch replay defense |
| VotingCredential, VoterVerification, VoterAgreement | Election-scoped credential, eligibility record and consent |
| Election, Candidate, CandidatePlatform, PlatformPromise | Election lifecycle, candidates and accountability content |
| Vote, VoteEvent | One ballot per election/pseudonym and cast/recall ledger |
| AuditCounter, AuditEvent | Serialized public commitment chain |
| BlockchainRecord | Outbox action, receipt and reconciliation state |
| RateLimitCounter, AdminGrant | Shared request limits and operator authorization |

A cast writes the ballot, a +100 event, an audit event and an outbox record in one MongoDB transaction. A recall updates the balance and appends a negative event, audit event and outbox action together. Unique indexes reject duplicate ballots and request IDs. Application checks enforce the current agreement, eligibility, candidate membership, election window, recall policy and ledger balance.

The `BlockchainRecord.actionJson` field contains only an opaque election key, ballot nullifier, candidate commitment, public policy and requested recall mode. It contains no Telegram ID, session token or raw candidate choice. `actionSequence` carries the serialized audit order. The Sepolia contract receives these opaque values and enforces its own balance and timing rules. The outbox separately tracks `PENDING`, `PROCESSING`, `SUBMITTED`, `CONFIRMED`, `FAILED` (retried with backoff) and `REJECTED` (refused by the contract; settled and never mirrored); a MongoDB commit does not imply contract confirmation.

Application rules and indexes do not prevent a database administrator from changing records directly. `npm run audit:check` verifies the chain, ballot sums and platform hashes. Independently observed Ethereum events and encrypted backups can provide comparison points. Back up Atlas and review the outbox before schema changes or a new contract deployment.
