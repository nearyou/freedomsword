import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, getAddress, http, type Abi, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

const rpc = process.env.BLOCKCHAIN_SEPOLIA_RPC_URL;
const key = process.env.BLOCKCHAIN_SIGNER_PRIVATE_KEY;
if (!rpc?.startsWith('https://') || !/^0x[a-fA-F0-9]{64}$/.test(key ?? ''))
  throw new Error('Configure a Sepolia HTTPS RPC and funded signer before deployment');
const artifact = JSON.parse(readFileSync(
  'artifacts/contracts/FreedomSwordVoting.sol/FreedomSwordVoting.json', 'utf8',
)) as { abi: Abi; bytecode: Hex };
const account = privateKeyToAccount(key as Hex);
const client = createPublicClient({ chain: sepolia, transport: http(rpc) });
if (await client.getChainId() !== sepolia.id) throw new Error('RPC is not Ethereum Sepolia');
const wallet = createWalletClient({ account, chain: sepolia, transport: http(rpc) });
const hash = await wallet.deployContract({
  abi: artifact.abi, bytecode: artifact.bytecode, args: [getAddress(account.address)],
});
const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 2 });
if (receipt.status !== 'success' || !receipt.contractAddress)
  throw new Error('Contract deployment did not succeed');
console.log(JSON.stringify({
  contractAddress: receipt.contractAddress,
  deploymentBlock: receipt.blockNumber.toString(),
  transactionHash: hash,
}));
