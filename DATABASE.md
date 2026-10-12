# Database design

MongoDB Atlas is the persistence engine. `prisma/schema.prisma` defines the collections and unique indexes; run `npm run db:push` against an Atlas replica set before using a new database. Prisma uses MongoDB transactions for multi-document writes. The old SQL migrations are historical and must not be run against Atlas.

| Collection | Purpose |
| --- | --- |
| User | Unique Telegram ID, random private voter key, session version and write-lock revision |
| TelegramAuthReplay | One-time digest of a Telegram launch hash |
| VoterVerification | Provider result and unique provider/subject commitment |
| VotingCredential | Unique user/election token, kept private from public ballot reads |
| VoterAgreement | Versioned agreement hash and consent commitment |
| Election | Election dates, lifecycle, recall policy and write-lock revision |
| Candidate, CandidatePlatform, PlatformPromise | Fictional choices, versioned platforms and progress |
| Vote, VoteEvent | Unique election/pseudonym ballot and cast/recall ledger |
| AuditCounter, AuditEvent | Serialized sequence and linked public commitment chain |
| BlockchainRecord | Pending, processing, submitted, confirmed or failed commitment anchor |
| RateLimitCounter | Shared hashed-subject action limits |
| AdminGrant | Operator-assigned election manager role |

A cast writes one ballot, its +100 event, audit event and outbox record in a single transaction. Recall updates the balance and appends a negative event and matching audit/outbox entries in a single transaction. Unique indexes prevent duplicate ballot pseudonyms, request IDs, Telegram IDs, and provider subject commitments. Application checks enforce election windows, candidate membership, recall policy, balance sums, agreement version, and manager lifecycle rules.

MongoDB does not execute the PostgreSQL triggers that previously prevented direct edits to audit records, ballots, credentials, or active election configuration. An administrator with database write access can bypass application rules. `npm run audit:check` detects many alterations to the hash chain, ballot sums, and platform hashes; independently retained Sepolia commitments and encrypted backups are needed to compare against a compromised database. Database access should be limited to the application and trusted operators. The Sepolia record is an opaque commitment only, not the ballot database.

The fictional seed adds three demo elections, ten candidates and platforms without deleting existing ballots. A PostgreSQL database is **not** migrated by `db:push`; import requires a separately reviewed mapping and reconciliation of every ballot and audit root. Back up Atlas before schema changes and verify `/api/ready` after each deployment.
