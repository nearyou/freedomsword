# FreedomSword architecture

`frontend` and `backend` are independent npm workspaces. The frontend is a Next.js application with pages, React components and browser hooks in `frontend/src/app`. The backend is an Express application exported from `backend/src/app.ts`, with route modules in `backend/src/routes`, a local server entry in `backend/bin/server.ts`, and MongoDB, security, and Ethereum services in `backend/src`. Prisma, Solidity contracts, operator scripts, and the outbox cron configuration belong to `backend`. There is no shared source package or cross-workspace import. Each side owns the types it needs; the HTTP JSON API is their boundary.

The frontend proxies `/api/:path*` to `BACKEND_URL` with a Next.js rewrite. Browsers continue to use same-origin `/api` URLs, including session-cookie and origin-protected writes. The backend checks `APP_ORIGIN` against the frontend's public origin. The public transparency page fetches the backend API on the server; the citizen agreement text and hash always come from the backend's `/api/agreement` response. A frontend deployment requires a reachable backend URL, and both deployments must use matching origins. For local development, `npm run dev` starts the backend on port 3001 and frontend on port 3000.

The API validates Telegram `initData` on the server, issues signed HTTP-only sessions, validates requests, and calls backend services. Public election reads and private citizen reads have separate projections. The frontend does not import Prisma, signing keys, or the Ethereum relayer.

MongoDB Atlas is the application database. Prisma 6 defines collections and indexes, applied with `prisma db push`. Multi-document transactions combine cast or recall state, audit commitments and outbox records. Unique keys and revision increments serialize competing operations. A ballot has one initial 100-unit allocation; partial and full recalls follow the election's stored policy.

`FreedomSwordVoting.sol` is an Ethereum Sepolia contract controlled by an owner and an authorized relayer. It stores an opaque election key and ballot nullifier, a salted candidate commitment, the remaining unit balance and recall timestamps/counts. It enforces one initial ballot, immutable policy after registration, election windows and recall restrictions. The first cast registers the election configuration if it has not been registered already. The application checks Telegram authentication, eligibility and candidate membership before creating the MongoDB ballot; the contract cannot verify those facts.

Each successful MongoDB write creates a salted audit commitment. Cast and recall records include a contract action in the same transaction. The outbox processes one Sepolia action at a time in audit-sequence order, saves the transaction hash, then checks its mined receipt and exact calldata. Contract action commitments are unique, so a retry cannot apply the same action twice. A timed-out request may need to recover an already mined transaction from event logs. Set `BLOCKCHAIN_CONTRACT_DEPLOYMENT_BLOCK` to keep that lookup bounded.

MongoDB and Ethereum have no shared transaction. The API returns a successful database write before the contract confirms it. If the chain action fails, the ballot remains in MongoDB and the outbox marks it failed for investigation. Delayed submissions can miss the on-chain election window. Existing ballots created before contract integration have no matching on-chain cast; they require a reviewed migration before their recalls can be mirrored. Do not enable the Sepolia adapter for a populated election without reconciliation.

The on-chain nullifier links a cast to its recalls in public data. It does not contain a Telegram ID or raw candidate ID, but the server and signer can relate it to a MongoDB ballot. This is a fictional demonstration with a mock eligibility provider, not an anonymous or binding election system.

## API surface

- `POST /api/auth` and `/api/logout`: Telegram sign-in and session lifecycle.
- `GET /api/elections` and `/api/me`: public aggregates and private ballot state.
- `POST /api/verify`, `/api/agreement`, `/api/vote`, `/api/recall`, `/api/platform/sign`: authenticated actions.
- `GET /api/audit`, `/api/elections/[id]/transparency`, `/api/elections/[id]/audit-export`: public evidence.
- `POST /api/blockchain/retry` and `/api/cron/outbox`: bounded outbox processing.
- `/api/admin/elections` and `/api/admin/metrics`: election management.
- `GET /api/health` and `/api/ready`: process and MongoDB health.
