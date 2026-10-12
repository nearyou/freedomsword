# FreedomSword backup and recovery plan

This is an operator plan for the fictional-election MVP. Choose backup retention, recovery objectives, and named operators before public use. The application does not automatically restore or rewrite evidence.

## Atlas backups and restoration

Enable scheduled Atlas backups or snapshots with encryption and a retention policy. Store the last independently witnessed audit root hash, app revision, backup time, and a sample of confirmed Sepolia transaction hashes outside Atlas. Before `prisma db push`, seed changes, or secret rotation, take a fresh snapshot. Rehearse restoration into an **isolated** Atlas database; never test by overwriting the live one. On the restored database run `npm run audit:check`, compare the audit root and record counts with the retained evidence, then run `/api/ready` and focused read checks against a staging build.

`npm run test:integration` creates and drops its own uniquely named temporary database. It is not a backup or recovery tool. `prisma db push` changes schema and indexes but does not import existing ballot data.

## Outbox and Sepolia recovery

Inspect `BlockchainRecord` states and the manager's fixed-label outbox metrics. A `PROCESSING` claim becomes reclaimable after its lease expires; `SUBMITTED` needs receipt reconciliation. `CONFIRMED` means the matching contract transaction was observed successfully. A crash after submission can leave an action in MongoDB without its transaction hash; the adapter checks the contract action commitment and recovers its event before resending. After five failed claims, investigate the cause and reset only the specific record under an operator-reviewed procedure. Never delete audit or outbox records to clear an alert.

If the RPC fails, restore connectivity and run `npm run outbox:worker` on an always-on host or call the authenticated retry endpoint in bounded batches. Vercel request-triggered processing does not guarantee idle-time reconciliation. Keep the Sepolia signer funded with testnet ETH, restrict access to its key, and monitor pending transaction time and gas usage.

## Incident and secrets

If schema and app versions disagree, stop new writes and disable outbox submission while investigating. Restore the last compatible build or move forward with a reviewed schema change. Verify the audit chain, aggregate tallies, active election windows, and independent chain anchors before resuming. Use the manager close action to stop an election; do not edit ballots directly.

Rotate `SESSION_SECRET` across instances together; this invalidates sessions. Rotate the Telegram bot token via BotFather, update Vercel secrets, and test a fresh Mini App launch. Keep `BALLOT_SECRET` stable while any ballot depends on it, and `ELIGIBILITY_COMMITMENT_SECRET` stable while identity commitments depend on it; both require reviewed migrations for rotation. Rotate the Atlas password that appeared in chat before deployment. Never paste new passwords or private keys into chat, logs, command output, source, or Git.
