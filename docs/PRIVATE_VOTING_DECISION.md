# FreedomSword private voting decision

Status: implementation in progress. Existing demonstration elections still use mock eligibility and the legacy plaintext ballot workflow. A separate local MACI test path is available only on chain ID 31337; no deployed election should be described as Rarimo verified.

## What can be tested now

The application can register a locally eligible citizen's MACI public key, build a poll-join proof in the browser, relay the join transaction, and submit signed encrypted vote messages. It does not hold the voter's private key or plaintext choice in Express or MongoDB. After the coordinator submits a proof-verified tally on-chain, an election manager can import the aggregate with **Publish private results**. This path is deliberately limited to a local chain and uses the mock citizen verification flow. A submitted encrypted message is not evidence that a vote was counted.

To exercise the complete local flow, an operator must supply a MACI v3 deployment and its test proving artifacts. Follow the upstream [MACI quick start](https://maci.pse.dev/docs/quick-start/) for its own `localhost` deployment, non-quadratic poll, 100-credit proxy, coordinator key, join circuit artifacts, merge, prove, and submit-on-chain steps. The MACI contract, local gate, coordinator, vote options, dates, and candidate order must match the election before **Configure private poll** succeeds. Keep the coordinator private key and proving files outside this repository; the frontend join `.wasm` and `.zkey` must be served at the same-origin paths set in `frontend/.env.example`. The application cannot manufacture these artifacts or a trustworthy final tally from database rows.

The full MACI deployment, on-device join proof, vote replacement, coordinator proof generation, and on-chain tally have **not** been exercised together yet. `npm run check`, `npm run test:integration`, and `npm run build` validate the application and its mocked chain boundaries, not that external end-to-end sequence. Real Rarimo proof verification and a production eligible-voter gate are still required before this can be used for Ukrainian citizens aged 18 or older.

The `MACI_PRIVATE` election protocol is isolated from legacy cast and recall APIs and legacy transparency projections. A configured local MACI v3 poll can be activated for development/test with `LocalMaciTestGate.sol`, which refuses deployment unless chain ID is 31337. It cannot satisfy production eligibility. Poll joining, encrypted message submission, and importing on-chain proof-verified aggregate results are present. The coordinator must still be operated separately using MACI's proving tools, and Rarimo verification is not integrated. This is a test bypass, not a production election.

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
