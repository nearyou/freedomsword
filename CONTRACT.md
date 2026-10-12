# FreedomSword voting contract

`contracts/FreedomSwordVoting.sol` is an operator-relayed Ethereum Sepolia ledger for fictional elections. The contract owner can rotate the relayer; only that relayer can register an election, cast, recall, close an election or anchor a generic audit commitment. No contract method accepts ETH.

The first cast registers an election's open and close times and recall policy. The configuration hash cannot change afterward. A cast creates one 100-unit ballot for an opaque election/nullifier pair. Partial recall removes the configured amount; full recall removes the balance. The contract enforces first-recall delay, cooldown, maximum operation count, nonnegative balance and the election window. Full recall consumes the original ballot permanently. A close action blocks any later cast or recall, including when no ballot was cast.

The contract does **not** verify Telegram accounts, real-person eligibility, agreement acceptance or that a choice belongs to the candidate list. The backend verifies those before creating a MongoDB ballot and relays a salted candidate commitment. The contract exposes its nullifier, commitment, balance and action times to public observers. The relayer can link the nullifier to a private MongoDB credential. This design does not provide secret voting, independent eligibility or candidate totals on-chain.

Build and test locally:

```sh
npm ci
npm run contract:build
npm run contract:test
```

`contract:build` compiles Solidity and regenerates the checked-in ABI at `src/backend/chain/abi.json`. A contract change must include its matching ABI. `contract:test` runs EVM tests for duplicate ballots, partial/full recalls, policy immutability, timing, relayer permissions and close behavior.

When explicitly deploying, set `BLOCKCHAIN_SEPOLIA_RPC_URL` and `BLOCKCHAIN_SIGNER_PRIVATE_KEY` only in the server environment, fund the signer with testnet ETH, then run `npm run contract:deploy:sepolia`. The command prints a contract address and deployment block. Set those as `BLOCKCHAIN_CONTRACT_ADDRESS` and `BLOCKCHAIN_CONTRACT_DEPLOYMENT_BLOCK` before selecting `BLOCKCHAIN_ADAPTER=sepolia`. The deployment script checks the chain ID and waits for two receipt confirmations; it does not update Vercel or Telegram settings.

MongoDB commits first and Ethereum follows through an ordered outbox. A failed contract transaction does not roll back a MongoDB vote. Inspect `BlockchainRecord` states, correct the cause and reconcile before representing the action as confirmed on-chain. Existing MongoDB ballots cannot simply be replayed onto a newly deployed contract: their original times and audit commitments require a reviewed migration, and expired elections cannot be backfilled under the contract's window rules. Start a fresh fictional election when a migration is unavailable.
