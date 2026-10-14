import 'dotenv/config';
import { createPublicClient, createWalletClient, defineChain, getAddress, http,
  isAddress, parseAbi, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const rpc = process.env.RARIMO_RPC_URL;
const key = process.env.RARIMO_SIGNER_PRIVATE_KEY;
const policy = process.env.RARIMO_POLICY_ADDRESS;
const maci = process.env.RARIMO_MACI_ADDRESS;
if (!rpc?.startsWith('https://') || !/^0x[a-fA-F0-9]{64}$/.test(key ?? '') ||
  !isAddress(policy ?? '') || !isAddress(maci ?? ''))
  throw new Error('Set RARIMO_RPC_URL, signer, policy address, and MACI address');
const chain = defineChain({ id: 7368, name: 'Rarimo L2',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpc] } } });
const client = createPublicClient({ chain, transport: http(rpc) });
if (await client.getChainId() !== 7368) throw new Error('RPC is not Rarimo L2');
const abi = parseAbi(['function owner() view returns (address)',
  'function guarded() view returns (address)', 'function setTarget(address)']);
const account = privateKeyToAccount(key as Hex);
const address = getAddress(policy!);
const target = getAddress(maci!);
const [owner, current, policyCode, maciCode] = await Promise.all([
  client.readContract({ address, abi, functionName: 'owner' }),
  client.readContract({ address, abi, functionName: 'guarded' }),
  client.getCode({ address }), client.getCode({ address: target }),
]);
if (owner.toLowerCase() !== account.address.toLowerCase() ||
  current !== '0x0000000000000000000000000000000000000000' || !policyCode || !maciCode)
  throw new Error('Policy is not unlinked, owned by this signer, and deployed with MACI');
const wallet = createWalletClient({ account, chain, transport: http(rpc) });
const simulation = await client.simulateContract({ account, address, abi,
  functionName: 'setTarget', args: [target] });
const hash = await wallet.writeContract(simulation.request);
const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 2 });
if (receipt.status !== 'success') throw new Error('Policy linking did not succeed');
console.log(JSON.stringify({ policyAddress: address, maciAddress: target, transactionHash: hash }));
