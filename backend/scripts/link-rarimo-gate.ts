import 'dotenv/config';
import { createPublicClient, createWalletClient, defineChain, getAddress, http,
  isAddress, parseAbi, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const rpc = process.env.RARIMO_RPC_URL;
const key = process.env.RARIMO_SIGNER_PRIVATE_KEY;
const gate = process.env.RARIMO_GATE_ADDRESS;
const maci = process.env.RARIMO_MACI_ADDRESS;
if (!rpc?.startsWith('https://') || !/^0x[a-fA-F0-9]{64}$/.test(key ?? '') ||
  !isAddress(gate ?? '') || !isAddress(maci ?? ''))
  throw new Error('Set RARIMO_RPC_URL, signer, gate address, and MACI address');
const chain = defineChain({ id: 7368, name: 'Rarimo L2',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpc] } } });
const client = createPublicClient({ chain, transport: http(rpc) });
if (await client.getChainId() !== 7368) throw new Error('RPC is not Rarimo L2');
const abi = parseAbi(['function owner() view returns (address)',
  'function maci() view returns (address)', 'function setMaci(address)']);
const account = privateKeyToAccount(key as Hex);
const address = getAddress(gate!);
const target = getAddress(maci!);
const [owner, current, gateCode, maciCode] = await Promise.all([
  client.readContract({ address, abi, functionName: 'owner' }),
  client.readContract({ address, abi, functionName: 'maci' }),
  client.getCode({ address }), client.getCode({ address: target }),
]);
if (owner.toLowerCase() !== account.address.toLowerCase() ||
  current !== '0x0000000000000000000000000000000000000000' || !gateCode || !maciCode)
  throw new Error('Gate is not unlinked, owned by this signer, and deployed with MACI');
const wallet = createWalletClient({ account, chain, transport: http(rpc) });
const simulation = await client.simulateContract({ account, address, abi,
  functionName: 'setMaci', args: [target] });
const hash = await wallet.writeContract(simulation.request);
const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 2 });
if (receipt.status !== 'success') throw new Error('Gate linking did not succeed');
console.log(JSON.stringify({ gateAddress: address, maciAddress: target, transactionHash: hash }));
