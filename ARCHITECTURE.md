# Architecture

FreedomSword is a Next.js Telegram Mini App. Route handlers validate Telegram `initData`, issue signed HTTP-only sessions, validate requests, and call server services. The client reads aggregate election data and private session-specific ballot state from separate endpoints. Public pages never join identities to ballots.

MongoDB Atlas is the only application database. Prisma 6 defines collections and unique indexes; `prisma db push` applies them. Multi-document transactions group votes, recall events, audit commitments, and outbox entries. MongoDB write conflicts (`P2034`) are retried with a bounded backoff. An increment to a User and Election revision field serializes concurrent citizen and election operations. The final election-window check happens inside the transaction using the application server clock; Vercel instances must keep accurate time.

A User has a private Telegram ID and random voter key. A VotingCredential holds an election-scoped random token on the identity side. A ballot pseudonym is HMAC-derived from that token. Vote and VoteEvent do not have a User foreign key, but the server and an operator with database/key access can reconnect them. This is separation of records, not anonymity.

`AuditEvent` forms a global hash chain. The shared `AuditCounter` serializes sequence allocation in transactions. The outbox records each opaque commitment. In development, a mock adapter confirms a deterministic receipt. In production, the Sepolia adapter sends the 32-byte commitment as input data of a zero-value self-transaction. The resulting hash has `SUBMITTED` status until a separate receipt check verifies mining, sender, recipient, and input, then sets `CONFIRMED`. A failed submission remains retryable up to the attempt limit. Only the commitment goes on chain; vote content and identity remain in MongoDB.

The shared MongoDB rate limiter stores hashed subjects, counts, and reset times. Telegram replay digests and request IDs use unique indexes. The optional outbox worker polls the same claim/lease interface as the retry endpoint; `vercel.json` schedules a daily secret-authenticated reconciliation, and higher volume needs a more frequent external worker.

The current eligibility provider is mock-only. It does not establish civil identity or prevent multiple accounts for one person. Rarimo and Telegram wallet integration are future work. Fictional elections and demonstration labels must remain visible.

## Main endpoints

- `POST /api/auth`, `/api/logout`: Telegram launch and session lifecycle.
- `GET /api/elections`, `/api/me`: public aggregates and private voter state.
- `POST /api/verify`, `/api/agreement`, `/api/vote`, `/api/recall`, `/api/platform/sign`: same-origin authenticated actions.
- `GET /api/audit`, `/api/elections/[id]/transparency`, `/api/elections/[id]/audit-export`: public commitment evidence.
- `POST /api/blockchain/retry`: authenticated bounded outbox processing.
- `/api/admin/elections`, `/api/admin/metrics`: election-manager operations.
- `GET /api/health`, `/api/ready`: process and MongoDB readiness.

The historic SQL migrations remain in the repository as archival references for the old PostgreSQL deployment. They do not apply to MongoDB.
