# FreedomSword client corrections — 24 October 2026

The supplied prototype 9 screenshots guide the ivory launch, blue call to action, navy citizen space, and portrait-led candidate profile. The launch now includes “Take back control. Manage your vote. Shape what comes next.” Candidate platforms remain versioned text, rather than uploaded files. Public transparency returns to the selected election's **My ballot** view.

## Reusable support

New elections can use `CONTINUOUS_SUPPORT`. Each participant has 100 units across all candidates in that election. Allocations and recalls accept any whole amount from 1 to 100. A participant can recall all support for a candidate in one action. Each withdrawal creates its own cooling lot and becomes available **six calendar months after that withdrawal**, at the same UTC time. End-of-month dates clamp to the last day of the target month. Units released from one lot are independent of later withdrawals. Released units may return to the same candidate or support another candidate, in parts or in full; withdrawing again starts a new six-month timer.

MongoDB transactions lock the participant and election, enforce the 100-unit budget, and commit the allocation/withdrawal event and audit record together. A request UUID makes retries idempotent. `/api/support` exposes only the signed-in participant's state. Public results and transparency expose aggregates. `audit:check` verifies each support ledger against the stored allocations and cooling budget.

This mode is **application-enforced**. The existing `FreedomSwordVoting` contract cannot enforce reallocation: reusable-support events anchor generic audit commitments through the outbox. Do not describe these balances as enforced by that contract. Existing `LEGACY_RECALL` elections keep their immutable one-ballot/non-reassignable policy, and MACI elections retain their separate encrypted protocol. There is no automatic migration of existing ballots.

Managers can create the new mode in `/admin`; it requires at least two candidates before activation. `npm run db:seed:support` adds one fictional reusable-support election without changing existing elections or ballots. After deploying the new Prisma schema, run that command once where the demonstration should appear. The usual `db:seed` command retains its original fixtures.

## Sharing and identity

The invitation offers Telegram, WhatsApp, X, Facebook, LinkedIn and Reddit, plus the device share sheet and a copyable caption. Instagram, TikTok and other installed apps depend on the operating system's share sheet; the interface does not pretend they expose a universal web posting endpoint. Sharing opens a draft; the participant decides whether to post.

The live legacy/reusable demo cannot substantiate a secret-ballot claim. Its invitation therefore says “True democracy starts with your voice” and includes the fictional-election/anonymity limitation. The requested Ukrainian bot welcome text is retained, with the exact FreedomSword spelling and an explicit current-demo qualifier. `npm run bot:description -w @freedomsword/backend -- --apply` updates and reads back the default, Ukrainian and English description, backing up previous values in the ignored `.local-telegram/` directory. The bot token stays in the backend environment.

Telegram launch authentication remains enabled. The Mini App already supplies the launch data, so no separate Telegram OAuth/account-linking flow is needed. A future wallet-only login must verify a fresh, domain-bound `ton_proof` on the server and migrate account recovery and ownership bindings. Wallet ownership alone does not establish citizenship, age or one-person-one-vote; Rarimo eligibility is a separate requirement for the private protocol. Wallet integration remains visibly planned.

## Separate feedback bot

The main voting bot is no longer used as a pretend feedback destination. Configure a **different** bot's username with frontend `NEXT_PUBLIC_FEEDBACK_BOT_USERNAME`, or backend `FEEDBACK_BOT_USERNAME` for VPS builds. Until configured, the interface shows “Feedback bot coming soon.” Creating the bot requires its owner's BotFather account.

The simple worker at `backend/scripts/feedback-bot.mjs` accepts messages/screenshots and copies them to a team chat. It acknowledges only after delivery succeeds; failed delivery retries. Copies omit the original Telegram profile. The bot's start message tells the sender where feedback goes and asks them not to send credentials or identity documents. Its persisted polling offset prevents reprocessing acknowledged updates after a normal restart; a crash between delivery and offset persistence may duplicate a message rather than lose it.

Backend configuration:

```dotenv
FEEDBACK_BOT_TOKEN="separate-bot-token"
FEEDBACK_CHAT_ID="numeric-team-chat-id"
FEEDBACK_BOT_USERNAME="FreedomSwordFeedbackBot"
FEEDBACK_STATE_FILE="/opt/freedomsword/.local-feedback/state.json"
```

Set the token as a server secret, never in `NEXT_PUBLIC_` variables or Git. The bot must be able to send messages to the configured team chat. Run `npm run feedback:bot -w @freedomsword/backend`, or configure a dedicated systemd service using the same backend environment, `User=freedomsword`, `WorkingDirectory=/opt/freedomsword/current/backend`, and `ExecStart=/usr/local/bin/node /opt/freedomsword/current/backend/scripts/feedback-bot.mjs`. Only one polling worker should run for this bot. Do not reuse the voting bot's token or remove another bot's webhook to start it.

The separate bot cannot be activated until its owner supplies the handle, token and destination chat ID.
