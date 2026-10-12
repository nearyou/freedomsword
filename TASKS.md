# FreedomSword delivery notes

## Current architecture

- Next.js routes in `src/app`; frontend components and hooks in `src/frontend`; server services in `src/backend`; shared contracts and rules in `src/shared`.
- MongoDB Atlas and Prisma 6 provide persistence, indexes and multi-document transactions.
- `contracts/FreedomSwordVoting.sol` enforces one 100-unit ballot per opaque nullifier, recall limits, cooldowns and election windows. The Sepolia adapter submits and reconciles contract actions through the MongoDB outbox.
- Telegram authorization, fictional eligibility, citizen agreement, candidate management, audit exports, idempotency and rate limiting remain server-side.

## Release work

- Deploy and independently review the Sepolia contract; set its address and deployment block in server configuration.
- Reconcile any existing ballots before enabling contract submission for an already populated election.
- Confirm a live Telegram launch, a fresh cast, a recall and matching mined contract receipts on the intended deployment.
- Obtain an independent security and privacy review before any binding election use. The mock eligibility provider does not prove civil identity or one-person-one-vote.
