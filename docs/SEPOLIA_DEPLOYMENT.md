# Sepolia voting contract

The MVP voting contract was deployed to Ethereum Sepolia (chain ID `11155111`) on 2026-10-16.

| Item | Value |
| --- | --- |
| Contract | [`0xabd86ceac138101575eddff6c4e0dc4ab34eeab7`](https://sepolia.etherscan.io/address/0xabd86ceac138101575eddff6c4e0dc4ab34eeab7) |
| Deployment block | `11924871` |
| Transaction | [`0x87fd5bfc625df0b30899c5e1b3bc88de66b515d4102c6b186c89586347cb1959`](https://sepolia.etherscan.io/tx/0x87fd5bfc625df0b30899c5e1b3bc88de66b515d4102c6b186c89586347cb1959) |
| Testnet signer address | `0x76bC63E60126D777e376b9CE21A80Eb16EeD87eA` |

The deployment transaction succeeded and contract bytecode was verified present through the Sepolia RPC. The signer private key is stored only in an ignored local environment file; never commit it. Production requires the same key in the backend Vercel project's `BLOCKCHAIN_SIGNER_PRIVATE_KEY` secret, alongside the RPC URL, contract address and deployment block. This deployment does not provide real Rarimo verification: the current production eligibility provider is `mock` until the separate Rarimo integration is configured and validated.
