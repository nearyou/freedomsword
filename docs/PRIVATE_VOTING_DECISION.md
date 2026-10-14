# FreedomSword private voting decision

Status: implementation in progress. The deployed and local app still use mock eligibility and the legacy plaintext ballot workflow. No current election should be described as a MACI or Rarimo election.

The `MACI_PRIVATE` election protocol is now isolated from the legacy cast and recall APIs and from legacy transparency projections. Private elections cannot be activated until a deployed MACI poll and Rarimo gate can be verified. `LocalMaciTestGate.sol` is a local-chain-only signup gate for contract tests: it refuses deployment unless chain ID is 31337 and cannot satisfy production eligibility. Run `npm run contract:test` to exercise it. This is a test bypass, not a private-voting deployment.

## Product rules

- Rarimo is the only planned eligibility provider. A Telegram account is an app login, not proof that a person is unique or eligible.
- The first private-election eligibility rule is Rarimo-proved Ukrainian citizenship (`UKR`) and age 18 or older on the registration date. Verify both constraints in the proof; do not infer them from Telegram profile data, accept a client assertion, or store a passport scan or birth date. Freeze the rule before registration opens.
- New private elections use MACI for encrypted ballots and a verifiable final tally. A voter may replace a vote while the poll is open; the last valid message determines the counted choice under the selected MACI poll configuration.
- Individual choices are private from the public and other voters. A trusted MACI coordinator may decrypt them to process the tally. The UI must explain this trust boundary instead of promising privacy from everyone.
- Candidate totals for a private election appear only after the poll closes and the tally proof is verified. Participation counts may be shown earlier only if they cannot reveal individual choices.
- Existing one-ballot, recall-based elections remain labeled as legacy demonstration elections. Do not silently convert existing ballots or mix the two protocols within an election.

## Why the current app does not meet this target

`Vote.candidateId` and `VoteEvent` are held in MongoDB, `GET /api/me` returns a candidate choice, public aggregates are computed from those rows, and the operator can relate ballots to accounts. The current Ethereum contract mirrors cast and recall actions. The eligibility provider is `mock`. None of this is MACI or Rarimo verification, so changing labels or encrypting one database field would not establish private voting.

## Integration boundary

1. Add an explicit election protocol version. New MACI elections must have separate registration, voting, result, and audit paths; legacy endpoints must reject requests for them. Freeze the protocol before opening an election.
2. Integrate Rarimo passport proof verification. Verify proof validity, jurisdiction and election eligibility, expiry, and an election-scoped uniqueness/nullifier value. Bind the accepted proof to a voter-generated MACI public key in a custom registration gate. Never accept a client-supplied `verified: true` flag as evidence.
3. Generate and retain the MACI private key on the citizen's device. The backend receives neither the private key nor a plaintext candidate choice. Define a recovery flow before release; losing this key can prevent a voter from changing a ballot.
4. Deploy a MACI poll and the Rarimo-aware gate on a compatible EVM network. The current Sepolia setup can remain the initial test network, but Rarimo registry replication and verifier availability on Sepolia must be confirmed before choosing the production network. Do not assume Rarimo and MACI contracts are already interoperable.
5. Submit encrypted, signed MACI messages. Store only opaque transaction references and operational status in the Express/MongoDB app. Remove candidate choice, choice-derived commitments, and account-to-choice links from new-election API responses, audit payloads, logs, and outbox records.
6. Run the trusted MACI coordinator as a separate service with protected keys and restricted logs. It processes messages and publishes the tally with its zero-knowledge proof after the poll closes. A Vercel request handler is not a substitute for this long-running role.
7. Publish aggregate results only after verifying the proof and mapping MACI vote options to the election's immutable candidate list. Keep the proof, contract addresses, poll ID, and tally artifact available for independent inspection.

## Release checks

- Replayed or duplicate Rarimo proofs cannot register extra MACI keys for the same election.
- A proof for one election cannot register in another without that election's own eligibility check.
- Vote changes are accepted only inside the poll window, and tally tests demonstrate that the correct final valid message is counted.
- Express, MongoDB, logs, audit exports, and public chain events contain no plaintext candidate choice linked to a citizen for MACI elections.
- Frontend messages distinguish an encrypted submission from a final counted vote, and do not show provisional candidate totals during a private poll.
- Define a minimum publication threshold or other small-poll policy: a final aggregate can reveal an individual's choice when very few citizens participate.
- End-to-end tests cover invalid proofs, key recovery failure, duplicate registration, coordinator outage, encrypted message submission, proof verification, and legacy-election isolation.
- An independent security and privacy review precedes any claim of production-grade or binding elections.

## Implementation constraints

Rarimo documents both [off-chain verification](https://docs.rarimo.com/zk-passport/guide-off-chain-verification/) and [on-chain verification](https://docs.rarimo.com/zk-passport/guide-on-chain-verification/). Its self-hosted off-chain verificator currently documents a PostgreSQL dependency, while FreedomSword's chosen application storage is MongoDB and Ethereum. Evaluate on-chain verification or an external verifier without silently adding PostgreSQL to this repository. The public verifier is a development dependency, not an unexamined production trust anchor.

[MACI's documentation](https://maci.pse.dev/docs/introduction/) describes privacy from everyone except a trusted coordinator and proof-backed final tallies. MACI reduces bribery incentives; it cannot honestly be described as making bribery impossible.
