import { readFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, defineChain, http, type Abi, type Hex } from 'viem';

// This is a local integration fixture. Its registry and verifier accept synthetic
// signals; neither proves possession of a passport or real-world eligibility.
const rpc = process.env.PRIVATE_VOTING_RPC_URL ?? 'http://127.0.0.1:8545';
const chain = defineChain({ id: 31337, name: 'FreedomSword local test',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [rpc] } } });
const client = createPublicClient({ chain, transport: http(rpc) });
const wallet = createWalletClient({ chain, transport: http(rpc) });
if (await client.getChainId() !== 31337)
  throw new Error('The local Rarimo smoke test requires chain ID 31337');
const [account] = await wallet.getAddresses();
if (!account) throw new Error('The local Hardhat node has no unlocked account');

function artifact(file: string, contract: string) {
  return JSON.parse(readFileSync(`artifacts/contracts/${file}/${contract}.json`, 'utf8')) as {
    abi: Abi;
    bytecode: Hex;
  };
}

async function deploy(file: string, contract: string, args: readonly unknown[] = []) {
  const compiled = artifact(file, contract);
  const hash = await wallet.deployContract({ account, abi: compiled.abi,
    bytecode: compiled.bytecode, args });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success' || !receipt.contractAddress)
    throw new Error(`${contract} deployment failed`);
  return { address: receipt.contractAddress, abi: compiled.abi };
}

const fixture = 'RarimoMaciGate.t.sol';
const registry = await deploy(fixture, 'RarimoRegistryMock');
const verifier = await deploy(fixture, 'RarimoVerifierMock');
const maci = await deploy(fixture, 'RarimoMaciTargetMock');
const block = await client.getBlock();
const gate = await deploy('RarimoMaciGate.sol', 'RarimoMaciGate',
  [registry.address, verifier.address, 77n, block.timestamp + 86_400n]);
const linkHash = await wallet.writeContract({ account, address: gate.address, abi: gate.abi,
  functionName: 'setMaci', args: [maci.address] });
if ((await client.waitForTransactionReceipt({ hash: linkHash })).status !== 'success')
  throw new Error('Could not link the local MACI target');

const date = new Date(Number(block.timestamp) * 1_000);
const digits = `${String(date.getUTCFullYear() % 100).padStart(2, '0')}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
const today = BigInt(`0x${Buffer.from(digits, 'ascii').toString('hex')}`);
const key = { x: 1n, y: 2n };
const accountCommitment = `0x${'0'.repeat(63)}1` as Hex;
const eventData = await client.readContract({ address: gate.address, abi: gate.abi,
  functionName: 'eventData', args: [key, accountCommitment] }) as bigint;
const ageBound = await client.readContract({ address: gate.address, abi: gate.abi,
  functionName: 'ageUpperBound', args: [today] }) as bigint;
const signals = Array<bigint>(23).fill(0n);
signals[0] = 42n;
signals[6] = BigInt('0x554b52'); // UKR
signals[9] = 77n;
signals[10] = eventData;
signals[11] = 123n;
signals[12] = 38945n;
signals[13] = today;
signals[17] = 1n;
signals[18] = BigInt('0x303030303030'); // 000000
signals[19] = ageBound;
signals[20] = today;
signals[21] = signals[18];
const points = [[0n, 0n], [[0n, 0n], [0n, 0n]], [0n, 0n]] as const;
const args = [key, accountCommitment, signals, ...points] as const;

async function mustReject(label: string, attempt: () => Promise<unknown>) {
  try { await attempt(); }
  catch { return; }
  throw new Error(`${label} was unexpectedly accepted`);
}

const rejected = await wallet.writeContract({ account, address: verifier.address,
  abi: verifier.abi, functionName: 'setValid', args: [false] });
await client.waitForTransactionReceipt({ hash: rejected });
await mustReject('invalid proof', () => client.simulateContract({ account,
  address: gate.address, abi: gate.abi, functionName: 'register', args }));
const restored = await wallet.writeContract({ account, address: verifier.address,
  abi: verifier.abi, functionName: 'setValid', args: [true] });
await client.waitForTransactionReceipt({ hash: restored });
const registration = await wallet.writeContract({ account, address: gate.address,
  abi: gate.abi, functionName: 'register', args });
const receipt = await client.waitForTransactionReceipt({ hash: registration });
if (receipt.status !== 'success') throw new Error('Valid local registration reverted');
await mustReject('duplicate nullifier', () => client.simulateContract({ account,
  address: gate.address, abi: gate.abi, functionName: 'register', args }));
const signups = await client.readContract({ address: maci.address,
  abi: maci.abi, functionName: 'signups' });
if (signups !== 1n) throw new Error('Exactly one MACI signup was expected');

console.log(JSON.stringify({ network: 'Hardhat local', chainId: 31337,
  verification: 'MOCK ONLY; no passport was checked', gateAddress: gate.address,
  registryAddress: registry.address, verifierAddress: verifier.address,
  maciTargetAddress: maci.address, registrationTxHash: registration,
  invalidProofRejected: true, duplicateRejected: true, maciSignups: signups.toString() }));
