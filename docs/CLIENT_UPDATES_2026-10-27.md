# Client corrections — 27 October 2026

The current layout is retained. Launch and mission use the light palette over the city image; connection and later screens remain dark, including Telegram chrome. Candidate platforms remain text. Public transparency returns to the selected election's My ballot screen.

Recall uses a selector with 0.25 / 25 units, 0.50 / 50 units, 0.75 / 75 units, and all remaining support (100 units on a fresh ballot). Options exceeding the balance or incompatible with the election's frozen policy are omitted. A chosen 50 or 75 units is one transaction and one recall operation; delays, cooldowns, operation limits and idempotency continue to apply. These numbers express fractions of the original 100-unit ballot, not fractional database units.

The existing Sepolia contract cannot process selected amounts. The updated Solidity contract adds `recallVoteAmount` while preserving the old entry point. The API checks `selectableRecallSupported` before accepting an explicit amount on Sepolia. Deploying the new source does not upgrade an existing immutable contract or migrate its ballots. A separate reviewed contract deployment/migration is required before enabling these amounts on a real chain. The current VPS uses the mock adapter.

Sharing now uses https://freedomsword.org and a motivating invitation. More opens Telegram, WhatsApp, X, Facebook, LinkedIn, Reddit, email, device sharing and copy actions. Instagram, TikTok and apps without web share composers use the device share sheet or pasted invitation. Anonymity is not claimed while the legacy ballot is operator-readable.

Feedback must use a separate bot. Configure backend `FEEDBACK_BOT_USERNAME`, `FEEDBACK_BOT_TOKEN`, `FEEDBACK_CHAT_ID` and an absolute persistent `FEEDBACK_STATE_FILE` outside release directories. The deployment passes only the username to the frontend. Run `npm run feedback:bot -w @freedomsword/backend` as one supervised worker; it copies private feedback messages to the receiving chat and acknowledges successful delivery. No worker is activated without these credentials. The UI displays an unavailable state rather than linking to the main bot when not configured.

The Ukrainian bot description can be published with `npm run bot:description -w @freedomsword/backend -- --apply`; it saves the prior descriptions before updating and verifies the result. It uses FreedomSword branding and retains the current demo/privacy qualification.

## Outstanding release work

The earlier six-calendar-month reuse rule remains a separate protocol requirement: each withdrawal must unlock independently, permit reallocation to the same or other candidates, and support repeated cycles. The present legacy ballot permanently removes recalled units. Do not imply that the amount selector implements reuse. Reconcile continuous support with the private-voting model and implement/verify that protocol before a completed production release. Live Rarimo proof acceptance, MACI tally operation, wallet integration and production security/operations acceptance remain on the release plan.
