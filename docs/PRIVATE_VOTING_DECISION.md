# FreedomSword private voting decision

Status: Rarimo registration is implemented in code but has not been deployed or exercised with a real passport proof. Existing demonstration elections still use mock eligibility and the legacy plaintext ballot workflow. A separate local MACI test path is available only on chain ID 31337; no deployed election should be described as Rarimo verified yet.

## What can be tested now

The application can register a locally eligible citizen's MACI public key, build a poll-join proof in the browser, relay the join transaction, and submit signed encrypted vote messages. It does not hold the voter's private key or plaintext choice in Express or MongoDB. After the coordinator submits a proof-verified tally on-chain, an election manager can import the aggregate with **Publish private results**. This path is deliberately limited to a local chain and uses the mock citizen verification flow. A submitted encrypted message is not evidence that a vote was counted.

To exercise the complete local flow, an operator must supply a MACI v3 deployment and its test proving artifacts. Follow the upstream [MACI quick start](https://maci.pse.dev/docs/quick-start/) for its own `localhost` deployment, non-quadratic poll, 100-credit proxy, coordinator key, join circuit artifacts, merge, prove, and submit-on-chain steps. The MACI contract, local gate, coordinator, vote options, dates, and candidate order must match the election before **Configure private poll** succeeds. Keep the coordinator private key and proving files outside this repository; the frontend join `.wasm` and `.zkey` must be served at the same-origin paths set in `frontend/.env.example`. The application cannot manufacture these artifacts or a trustworthy final tally from database rows.

The full MACI deployment, on-device join proof, vote replacement, coordinator proof generation, and on-chain tally have **not** been exercised together yet. `npm run check`, `npm run test:integration`, and `npm run build` validate the application and its mocked chain boundaries, not that external end-to-end sequence. The Rarimo gate enforces Ukrainian citizenship, age 18+, document expiry, an eligible registry root, a proof from a pinned verifier, and one registration per election-scoped nullifier. These checks still need a real RariMe passport proof and a deployed Rarimo L2 MACI poll before they can be described as operational verification.

For a local JSON-RPC check, run `npm run testnet:node` and then `npm run testnet:smoke` in a second terminal. The latter deploys mock registry and verifier contracts plus the actual Rarimo gate on chain ID 31337, tests synthetic signup and rejection paths, and prints its local addresses. These mocks cannot establish passport eligibility; the real Rarimo path requires the canonical registry and a pinned TD3 verifier on Rarimo L2 (chain ID 7368).

The `MACI_PRIVATE` election protocol is isolated from legacy cast and recall APIs and legacy transparency projections. A configured local MACI v3 poll can be activated for development/test with `LocalMaciTestGate.sol`, which refuses deployment unless chain ID is 31337. It cannot satisfy production eligibility. The Rarimo path uses `RarimoMaciGate.sol` on chain 7368 and obtains a TD3 proof through RariMe's QR flow. The server checks the deployment against the expected MACI poll, registration policy, canonical Rarimo registry, and pinned verifier runtime bytecode before an admin can configure or activate it. Poll joining, encrypted message submission, and importing on-chain proof-verified aggregate results are present. The coordinator must still be operated separately using MACI's proving tools.

## Rarimo deployment and test

1. Deploy the official `TD3QueryProofVerifier` and record its address and runtime bytecode hash. Use the canonical Rarimo L2 `RegistrationSMT` at `0x479F84502Db545FA8d2275372E0582425204A879`. The verifier hash must be independently checked and pinned as `RARIMO_VERIFIER_CODE_HASH`; the server rejects a different verifier. Set `RARIMO_REGISTRY_ADDRESS` to the canonical registry.
2. Set `RARIMO_VERIFIER_ADDRESS`, `RARIMO_ELECTION_ID` (the election UUID), and `RARIMO_ELECTION_CLOSES_AT` (Unix seconds) along with the backend-only RPC, signer, registry, and verifier hash. Run `npm run contract:deploy:rarimo-gate`; it checks the chain and pinned verifier before deploying `RarimoMaciGate`. Set `RARIMO_GATE_ADDRESS` and `RARIMO_GATE_CODE_HASH` from its output. Run `npm run contract:deploy:rarimo-policy` and set `RARIMO_POLICY_ADDRESS` and `RARIMO_POLICY_CODE_HASH` from its output. Deploy MACI v3 with that signup policy, a non-quadratic poll matching the election dates and candidate count, and a 100-credit voice-credit proxy. Set `RARIMO_MACI_ADDRESS`, then run `npm run contract:link:rarimo-gate` and `npm run contract:link:rarimo-policy` once. Fund a dedicated backend relayer. Never use the local test gate or mock eligibility on this chain.
3. In `/admin`, configure the draft election's private poll with chain ID `7368` and the deployed addresses, poll ID, and deployment block. Configuration and activation fail closed when the contracts or pinned verifier do not match. A citizen then connects Telegram, creates or restores a MACI key, scans the RariMe proof request, accepts the citizen agreement, joins the poll, and submits encrypted messages.
4. Test with a consenting Ukrainian adult holding a supported TD3 biometric passport. Also test an ineligible document, duplicate proof, wrong election/key, expired proof day, and proof-service interruption. The public RariMe verificator is used to deliver the proof to the browser; the contract verifies the proof on-chain. For a production service, arrange a supported verificator deployment and independent contract/security review. This repository does not add PostgreSQL.

The Rarimo public signals reveal an election nullifier and citizenship code on-chain. Proof event data also commits to the MACI key and a secret-salted, election-scoped account commitment, preventing a public transaction replay from attaching a registration to another Telegram account. The passport image, document number, full birth date, and MACI vote choice are not written to FreedomSword's database. Registration transactions and MACI keys remain public. The QR service can observe proof requests and should be included in a privacy review.

## Product rules

- Rarimo is the only real eligibility provider for private elections. A Telegram account is an app login, not proof that a person is unique or eligible.
- The first private-election eligibility rule is Rarimo-proved Ukrainian citizenship (`UKR`) and age 18 or older on the registration date. Verify both constraints in the proof; do not infer them from Telegram profile data, accept a client assertion, or store a passport scan or birth date. Freeze the rule before registration opens.
- New private elections use MACI for encrypted ballots and a verifiable final tally. A voter may replace a vote while the poll is open; the last valid message determines the counted choice under the selected MACI poll configuration.
- Individual choices are private from the public and other voters. A trusted MACI coordinator may decrypt them to process the tally. The UI must explain this trust boundary instead of promising privacy from everyone.
- Candidate totals for a private election appear only after the poll closes and the tally proof is verified. Participation counts may be shown earlier only if they cannot reveal individual choices.
- Existing one-ballot, recall-based elections remain labeled as legacy demonstration elections. Do not silently convert existing ballots or mix the two protocols within an election.

## Why legacy demo ballots do not meet this target

Legacy `Vote.candidateId` and `VoteEvent` are held in MongoDB, `GET /api/me` returns a candidate choice, public aggregates are computed from those rows, and the operator can relate ballots to accounts. The legacy Ethereum contract mirrors cast and recall actions. Its eligibility provider is `mock`. None of that workflow is MACI or Rarimo verification, so changing labels or encrypting one database field would not establish private voting.

## Integration boundary

1. Add an explicit election protocol version. New MACI elections must have separate registration, voting, result, and audit paths; legacy endpoints must reject requests for them. Freeze the protocol before opening an election.
2. The implemented Rarimo passport gate verifies proof validity, citizenship and age, expiry, and an election-scoped uniqueness/nullifier value. It binds the proof to a voter-generated MACI public key. Never accept a client-supplied `verified: true` flag as evidence. Live proof compatibility remains to be tested.
3. Generate and retain the MACI private key on the citizen's device. The backend receives neither the private key nor a plaintext candidate choice. Define a recovery flow before release; losing this key can prevent a voter from changing a ballot.
4. Deploy a MACI poll and the Rarimo-aware gate on Rarimo L2 (chain 7368), where the canonical registry lives. Verify contract interoperability with a real proof and full tally before release.
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

Rarimo documents both [off-chain verification](https://docs.rarimo.com/zk-passport/guide-off-chain-verification/) and [on-chain verification](https://docs.rarimo.com/zk-passport/guide-on-chain-verification/). FreedomSword uses on-chain verification and the public RariMe service only for proof delivery. Its self-hosted off-chain verificator currently documents a PostgreSQL dependency; FreedomSword's application storage remains MongoDB and Ethereum. The public service is a development dependency, not an unexamined production trust anchor.

[MACI's documentation](https://maci.pse.dev/docs/introduction/) describes privacy from everyone except a trusted coordinator and proof-backed final tallies. MACI reduces bribery incentives; it cannot honestly be described as making bribery impossible.
