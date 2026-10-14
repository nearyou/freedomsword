import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, defineChain, getAddress, http,
  isAddress, keccak256, stringToHex, type Abi, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const FIELD = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
const CANONICAL_REGISTRY = '0x479F84502Db545FA8d2275372E0582425204A879';
const rpc = process.env.RARIMO_RPC_URL;
const key = process.env.RARIMO_SIGNER_PRIVATE_KEY;
const verifier = process.env.RARIMO_VERIFIER_ADDRESS;
const verifierHash = process.env.RARIMO_VERIFIER_CODE_HASH;
const electionId = process.env.RARIMO_ELECTION_ID;
const closesAt = process.env.RARIMO_ELECTION_CLOSES_AT;
if (!rpc?.startsWith('https://') || !/^0x[a-fA-F0-9]{64}$/.test(key ?? '') ||
  !isAddress(verifier ?? '') || !/^0x[a-fA-F0-9]{64}$/.test(verifierHash ?? '') ||
  !electionId || !/^[0-9a-fA-F-]{36}$/.test(electionId) ||
  !closesAt || !/^\d+$/.test(closesAt) || BigInt(closesAt) <= BigInt(Math.floor(Date.now() / 1000)))
  throw new Error('Set RARIMO_RPC_URL, signer, verifier address/code hash, election UUID and future close timestamp');

const chain = defineChain({ id: 7368, name: 'Rarimo L2',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpc] } } });
const client = createPublicClient({ chain, transport: http(rpc) });
if (await client.getChainId() !== 7368) throw new Error('RPC is not Rarimo L2');
const verifierCode = await client.getCode({ address: getAddress(verifier!) });
const registryCode = await client.getCode({ address: CANONICAL_REGISTRY });
if (!verifierCode || !registryCode || keccak256(verifierCode) !== verifierHash!.toLowerCase())
  throw new Error('Official registry or pinned verifier bytecode is unavailable');

const artifact = JSON.parse(readFileSync(
  'artifacts/contracts/RarimoMaciGate.sol/RarimoMaciGate.json', 'utf8',
)) as { abi: Abi; bytecode: Hex };
const account = privateKeyToAccount(key as Hex);
const wallet = createWalletClient({ account, chain, transport: http(rpc) });
const eventId = BigInt(keccak256(stringToHex(electionId))) % FIELD;
if (eventId === 0n) throw new Error('Election UUID produced an invalid Rarimo event ID');
const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode,
  args: [CANONICAL_REGISTRY, getAddress(verifier!), eventId, BigInt(closesAt!)] });
const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 2 });
if (receipt.status !== 'success' || !receipt.contractAddress)
  throw new Error('Rarimo gate deployment did not succeed');
const gateCode = await client.getCode({ address: receipt.contractAddress });
if (!gateCode) throw new Error('Deployed gate bytecode is unavailable');
console.log(JSON.stringify({ gateAddress: receipt.contractAddress,
  gateCodeHash: keccak256(gateCode),
  deploymentBlock: receipt.blockNumber.toString(), eventId: eventId.toString(),
  transactionHash: hash }));
