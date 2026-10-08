# Privacy

Public APIs return candidate details, aggregated unit totals, promise progress, endorsement counts and salted audit commitments. They never return Telegram IDs, names from Telegram, private voter keys, ballot pseudonyms, per-person choices, agreement signatures or raw verification receipts.

The private User table stores only a Telegram ID, random voter key, timestamps and session version. Telegram profile names, usernames, photos and raw initData are not persisted. A private credential table stores one random token per user/election; new ballots carry only an election-scoped HMAC pseudonym and no direct identity FK. The server and database operator can derive the relationship through the credential table and HMAC key. This separation lowers accidental linkage in ballot code and public output but does not provide a secret ballot against the operator. Old ballots retain their earlier pseudonym and are mapped to a credential lazily.

The Telegram replay table stores a digest of the validated Telegram hash, not raw initData, and expires entries. Eligibility stores a keyed commitment of the provider's unique subject ID for duplicate detection; once set, it cannot be replaced through normal service or database writes. Provider proofs, metadata and denial reasons are not persisted. The eligibility commitment key must remain stable for the lifetime of the uniqueness policy; rotating it requires a coordinated migration.

Public commitments use random high-entropy salts to prevent dictionary attacks against small candidate/unit spaces. Salts and source payloads are not published. The blockchain interface accepts a commitment only and the included adapter makes no external calls. No personal data is sent to any blockchain.

Mock eligibility receipts stay private and expire. A future Rarimo/ZK integration must supply an election-scoped uniqueness/nullifier proof with unlinkability, revocation and appropriate threat modeling; replacing a mock method alone does not establish these properties.

Aggregates may reveal choices in tiny groups and frequent snapshots may enable timing correlation. A real deployment needs minimum reporting cohorts, delayed/batched publishing and independent privacy review. Audit output publishes commitments and sequence only, not event types or fine-grained timestamps. Browser preview is synthetic and stays local.

Retention/deletion policy is deliberately unresolved for legal deployment: identity deletion and immutable evidence have conflicting requirements. Do not enroll real voters until a reviewed policy is implemented. Local demo credentials and fictional candidates are development aids.

The election manager API projects election configuration, candidates, platforms and promises only. It does not query or return Telegram IDs, verification records, credentials, pseudonyms or per-ballot choices. An operator performing a role assignment through the deployment shell necessarily sees the account identifier used for that assignment.

The public transparency endpoint projects only election metadata, candidate profiles/platform hashes, aggregates, and election-scoped audit commitments with mock outbox status. It never serializes Vote or VoteEvent rows, request IDs, credentials, Telegram identifiers, provider identifiers, or session data. Public participation and candidate counts can still reveal information in very small elections; the deployment privacy review must consider reporting thresholds and timing.
