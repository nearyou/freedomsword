# FreedomSword backup and recovery plan

This is an operator-run plan for a staging or future production deployment. The app does not restore, delete, or rewrite evidence automatically. Before accepting real voters, choose an RPO/RTO, an encrypted offsite retention policy, a legal data-retention policy, and named operators for backup and restoration.

## PostgreSQL backups

Take scheduled encrypted PostgreSQL backups and retain WAL archives for point-in-time recovery if the deployment supports them. Keep backup credentials in a secret manager or protected PostgreSQL password file, never in a command-line URL, chat, log, or repository. Include all tables and the `_prisma_migrations` history. Capture a backup immediately before each migration or key rotation. Record its checksum, creation time, database version, app version, and last audit root hash outside the database. Regularly restore a backup into an **isolated** database and run `npm run audit:check` against that restored database. Never test a restore by overwriting the live database.

Example operator commands, after providing connection settings through protected environment variables or a password file:

```text
pg_dump -Fc -f <encrypted-backup-location>/democracy-<timestamp>.dump -h <host> -U <backup-user> <database>
pg_restore --list <encrypted-backup-location>/democracy-<timestamp>.dump
```

For a recovery rehearsal, create a new empty database through your normal DBA process, restore into it with `pg_restore`, point `DATABASE_URL` at that isolated database, and run `npm run db:generate`, `npm run audit:check`, `npm run check`, and `npm run test:integration`. The integration runner creates its own temporary database and does not change the restored one. Compare the restored audit root and expected recovery timestamp with independently stored records before any traffic switch.

## Migration recovery

Run `npx prisma migrate status` before and after `npm run db:migrate`. Apply new migrations only after a successful backup and a staging rehearsal. If a migration fails, stop writes and worker processes, inspect the database error and `_prisma_migrations` state, and restore or repair using a reviewed operator plan. Do not edit an applied migration. Use `prisma migrate resolve` only after verifying whether its SQL actually committed and documenting the corresponding manual repair. Validate schema readiness, evidence integrity, and application checks before resuming traffic.

## Audit and commitment recovery

Run `npm run audit:check` on the live or restored database to verify the SHA-256 chain, audit-to-outbox commitment binding, immutable ballot sums, and platform content hashes. Record the printed root hash outside the database. `npm run audit:verify -- <downloaded-audit-export.json>` verifies a public exported bundle without database access. A recomputed export hash does not establish source authenticity by itself; compare a previously witnessed root or trusted backup.

Inspect outbox status counts and the worker's fixed-label failure metrics when commitments are pending or failed. Restart `npm run outbox:worker` after database and readiness checks. A `PROCESSING` lease is reclaimable after expiry, and deterministic mock receipts tolerate a duplicate submission. Records stop automatic retry after five attempts. Investigate the adapter failure before an operator manually resets a specific exhausted record; keep its audit commitment unchanged. Never truncate the outbox or audit tables.

## Interrupted deployment or election

Take the web app and worker out of traffic if schema and code versions are inconsistent. Restore the prior working app build against a compatible database or finish the reviewed forward migration; do not alter old migration files. Check `/api/ready`, the active election window from database/server time, current tallies, and `npm run audit:check`. In-flight vote/recall transactions either commit with their audit/outbox entry or roll back. If an election needs an emergency stop, use the authorized manager close action and record the incident. Do not edit active/finished election rules or ballots directly to “repair” an outcome.

## Secret rotation

Rotate `SESSION_SECRET` by replacing it across all instances together; existing sessions become invalid and citizens must reconnect. Revoke/rotate the BotFather bot token through Telegram's operator process, update all web instances, then test a fresh Mini App launch. Keep `BALLOT_SECRET` stable while any ballot credential or legacy ballot depends on it; rotating it requires a reviewed, staged mapping migration that preserves every existing pseudonym and one-ballot rule. Likewise, rotating `ELIGIBILITY_COMMITMENT_SECRET` requires a coordinated migration preserving duplicate-identity commitments. Back up keys separately from database backups, restrict access, and never log or export them publicly. No commitment-only blockchain/mock record contains these secrets.
