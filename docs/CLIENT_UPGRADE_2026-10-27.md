# Prototype-9 client upgrade — 27 October 2026

The restored prototype-9 interface is the base. The opening screen follows the supplied layout: a large transparent navy/gold emblem, the two-line “Your voice. / Your choice.” headline, separate yellow-highlighted “Take back control.” and “Manage your vote.” lines, “Shape what comes next.”, a blue “Continue in Telegram” button, and “A modern democracy for a stronger tomorrow.” underneath. The original illustrated city/river asset `civic-parchment.webp` is used on the first two light screens. Later screens remain navy. Device status bars and Telegram's own header are supplied by the client, not painted into the website.

The transparent emblem is a reference-based image edit, saved as `frontend/public/brand/emblem-reference.png`; the original logo remains intact. The prompt is recorded in `docs/launch-emblem-prompt.txt`.

## Voting behavior

New elections default to CONTINUOUS_SUPPORT. The first demo card is the City Council reusable-support election. Each citizen has 100 units; they can allocate to different candidates, recall 25/50/75/100 units or another whole amount, and recall all support from a candidate at once. The selector displays the requested 0.25/0.50/0.75 fractions alongside their equivalent 25/50/75 units. Each withdrawal immediately reduces support and creates a separate six-calendar-month cooling lot. The month-end rule clamps to the last day of the target month. Released units can be reused in parts or in full; a later withdrawal creates a new timer. Transactions, per-citizen locks and idempotency keys protect the 100-unit budget.

Existing LEGACY_RECALL ballots remain under their original policy and are identified as original demo rules. Their selector also supports permitted larger partial amounts. The new contract source exposes `recallVoteAmount`; old deployed immutable contracts do not. Before accepting an explicit amount on Sepolia, the API checks the contract capability. No legacy contract is deployed or existing ballots migrated automatically.

Reusable support is enforced by the application database. Audit commitments can be anchored, but the legacy Solidity contract does not enforce these reusable balances. This operator-readable mode is separate from MACI private polls. It must not be advertised as anonymous or as a production private-election protocol. Rarimo proof acceptance and MACI tally operation remain separate release gates.

The citizen agreement is version 2 and explains the new rules. Existing users must deliberately accept the updated agreement before making further changes.

## Sharing, feedback and navigation

Invitations link to https://freedomsword.org. More opens a chooser containing Telegram, WhatsApp, X, Facebook, LinkedIn, Reddit, email, device sharing and copy actions. Instagram/TikTok/Signal and similar apps use device sharing or a pasted invitation. The invitation is motivating without promising anonymity that the current demo does not provide. Candidate platforms remain versioned text. Public transparency returns to the selected election's My ballot screen.

Feedback links only to a separate configured Telegram bot. Set `FEEDBACK_BOT_USERNAME`, `FEEDBACK_BOT_TOKEN`, `FEEDBACK_CHAT_ID`, and an absolute persistent `FEEDBACK_STATE_FILE` outside release folders in the backend environment. The deploy script exposes only the bot username to the frontend. Run `npm run feedback:bot -w @freedomsword/backend` under supervision after providing the credentials. The worker copies a private message to the team and thanks the sender only after delivery succeeds. When no separate bot is configured the UI shows an unavailable label; it never substitutes the main bot.

Telegram launch authentication already reuses the account that opened the Mini App. A wallet-only flow is not proof of a unique eligible person. Wallet integration remains optional pending the selected wallet implementation; do not use wallet ownership as a substitute for Rarimo eligibility.

## Deployment

The separate bot is `@freedomsword_feedback_bot`. Its credential and destination stay in the server environment. After configuration, run `sudo bash deploy/vps/install-feedback.sh` from the deployed release to install the supervised worker. Its state persists outside release directories; later deployments restart it with the other services. The installer checks configuration without printing credentials.

Apply the additive support schema without accepting destructive migrations, deploy the reviewed commit, and run `npm run db:seed:support` once. This targeted idempotent seed preserves all existing elections and ballots. It adds the reusable-support demo with fictional candidates. Do not run the broad demo seed against the live database.

`npm run bot:description -w @freedomsword/backend -- --apply` publishes the requested Ukrainian welcome description with FreedomSword spelling and a current demo/privacy qualification. It backs up and verifies the descriptions for the default, Ukrainian and English slots. Main Mini App URL changes still require the bot-owner account in BotFather.

## Validation

`npm run check` passes type checks, lint, 138 Vitest cases, five Node cases and 18 Solidity cases. The isolated MongoDB run passes five integration cases covering the six-month lifecycle, concurrency, validation, withdrawn-candidate recalls and selectable legacy recalls. The long multi-cycle test has a five-minute allowance because it exercises many transactions against the remote test database. Backend and frontend production builds pass with the required backend origin. The opening screens and candidate portrait layout were visually reviewed at a 390 × 844 phone viewport.
