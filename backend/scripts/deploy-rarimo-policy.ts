import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, defineChain, getAddress, http,
  isAddress, keccak256, type Abi, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const rpc = process.env.RARIMO_RPC_URL;
const key = process.env.RARIMO_SIGNER_PRIVATE_KEY;
const gate = process.env.RARIMO_GATE_ADDRESS;
if (!rpc?.startsWith('https://') || !/^0x[a-fA-F0-9]{64}$/.test(key ?? '') ||
  !isAddress(gate ?? ''))
  throw new Error('Set RARIMO_RPC_URL, signer, and deployed gate address');
const chain = defineChain({ id: 7368, name: 'Rarimo L2',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpc] } } });
const client = createPublicClient({ chain, transport: http(rpc) });
if (await client.getChainId() !== 7368 ||
  !await client.getCode({ address: getAddress(gate!) }))
  throw new Error('Gate is not deployed on Rarimo L2');
const artifact = JSON.parse(readFileSync(
  'artifacts/contracts/LocalMaciTestGate.sol/MaciGateOnlyPolicy.json', 'utf8',
)) as { abi: Abi; bytecode: Hex };
const account = privateKeyToAccount(key as Hex);
const wallet = createWalletClient({ account, chain, transport: http(rpc) });
const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode,
  args: [getAddress(gate!)] });
const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 2 });
if (receipt.status !== 'success' || !receipt.contractAddress)
  throw new Error('MACI signup policy deployment did not succeed');
const code = await client.getCode({ address: receipt.contractAddress });
if (!code) throw new Error('Deployed policy bytecode is unavailable');
console.log(JSON.stringify({ policyAddress: receipt.contractAddress,
  policyCodeHash: keccak256(code), deploymentBlock: receipt.blockNumber.toString(),
  transactionHash: hash }));
