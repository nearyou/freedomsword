import { createPublicClient, createWalletClient, defineChain, http, isAddress, parseAbi, parseEventLogs, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ApiError } from './errors';

const maciAbi = [
  { type: 'function', name: 'getPoll', stateMutability: 'view', inputs: [{ name: 'pollId', type: 'uint256' }], outputs: [{ type: 'tuple', components: [{ name: 'poll', type: 'address' }, { name: 'messageProcessor', type: 'address' }, { name: 'tally', type: 'address' }] }] },
  { type: 'function', name: 'signUpPolicy', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'stateTreeDepth', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'totalSignups', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getStateRootOnIndexedSignUp', stateMutability: 'view',
    inputs: [{ type: 'uint256' }], outputs: [{ type: 'uint256' }] },
] as const;
const pollAbi = [
  { type: 'function', name: 'getStartAndEndDate', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }, { type: 'uint256' }] },
  { type: 'function', name: 'getMaciContract', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'coordinatorPublicKey', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }, { type: 'uint256' }] },
  { type: 'function', name: 'voteOptions', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'extContracts', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }, { type: 'address' }, { type: 'address' }, { type: 'address' }, { type: 'address' }] },
] as const;
const gateAbi = [
  { type: 'function', name: 'maci', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
] as const;
const policyAbi = [
  { type: 'function', name: 'gate', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'guarded', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
] as const;
const creditsAbi = [
  { type: 'function', name: 'getVoiceCredits', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'bytes' }], outputs: [{ type: 'uint256' }] },
] as const;
const tallyAbi = [
  { type: 'function', name: 'mode', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'isTallied', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'totalTallyResults', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalSpent', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'tallyCommitment', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'getTallyResults', stateMutability: 'view',
    inputs: [{ type: 'uint256' }], outputs: [{ type: 'tuple', components: [
      { name: 'value', type: 'uint256' }, { name: 'isSet', type: 'bool' },
    ] }] },
] as const;
const localSignupAbi = parseAbi([
  'function owner() view returns (address)',
  'function usedTestNullifiers(bytes32) view returns (bool)',
  'function signUpFor(bytes32,(uint256 x,uint256 y))',
  'event LocalTestSignup(bytes32 indexed testNullifier,uint256 publicKeyX,uint256 publicKeyY)',
]);
const maciSignupAbi = parseAbi([
  'event SignUp(uint256 _stateIndex,uint256 _timestamp,uint256 indexed _userPublicKeyX,uint256 indexed _userPublicKeyY)',
]);
const pollVotingAbi = parseAbi([
  'function joinPoll(uint256,(uint256 x,uint256 y),uint256,uint256[8],bytes,bytes)',
  'function publishMessage((uint256[10] data),(uint256 x,uint256 y))',
  'event PollJoined(uint256 indexed _pollPublicKeyX,uint256 indexed _pollPublicKeyY,uint256 _voiceCreditBalance,uint256 _nullifier,uint256 _pollStateIndex)',
]);

export type PrivatePollInput = {
  chainId: number;
  maciAddress: string;
  pollAddress: string;
  tallyAddress: string;
  messageProcessorAddress: string;
  pollId: string;
  gateAddress: string;
  voiceCreditProxyAddress: string;
  deploymentBlock: string;
};

export function localPrivateTestingEnabled(env: Record<string, string | undefined> = process.env) {
  const mode = env.APP_ENV ?? env.NODE_ENV ?? 'development';
  return (mode === 'development' || mode === 'test') && env.NODE_ENV !== 'production';
}

export function privateClient(chainId: number = 31337) {
  const rpc = chainId === 31337 ? process.env.PRIVATE_VOTING_RPC_URL
    : chainId === 7368 ? process.env.RARIMO_RPC_URL : undefined;
  if (!rpc || !/^https?:\/\//.test(rpc))
    throw new ApiError(503, 'Private-voting RPC is not configured', 'PRIVATE_RPC_MISSING');
  return createPublicClient({ transport: http(rpc, { timeout: 8_000 }) });
}

function localClient() { return privateClient(31337); }

export async function privateRelayer(chainId: number = 31337) {
  if (chainId === 31337 && !localPrivateTestingEnabled())
    throw new ApiError(403, 'Local private voting is disabled outside development', 'PRIVATE_TEST_ONLY');
  if (chainId !== 31337 && chainId !== 7368)
    throw new ApiError(409, 'Unsupported private-voting chain', 'PRIVATE_WRONG_CHAIN');
  const rpc = chainId === 31337 ? process.env.PRIVATE_VOTING_RPC_URL : process.env.RARIMO_RPC_URL;
  const signer = chainId === 31337 ? process.env.PRIVATE_VOTING_SIGNER_PRIVATE_KEY
    : process.env.RARIMO_SIGNER_PRIVATE_KEY;
  if (!rpc || !/^0x[a-fA-F0-9]{64}$/.test(signer ?? ''))
    throw new ApiError(503, 'Private-voting relayer is not configured', 'PRIVATE_RELAYER_MISSING');
  const client = privateClient(chainId);
  if (await client.getChainId() !== chainId)
    throw new ApiError(503, 'Private-voting RPC is on the wrong chain', 'PRIVATE_WRONG_CHAIN');
  const account = privateKeyToAccount(signer as Hex);
  const chain = defineChain({ id: chainId, name: chainId === 31337 ? 'Local MACI test' : 'Rarimo L2',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpc] } } });
  const wallet = createWalletClient({ account, chain, transport: http(rpc, { timeout: 8_000 }) });
  return { client, account, wallet };
}

async function localRelayer() { return privateRelayer(31337); }

export async function validateLocalPrivatePoll(
  input: PrivatePollInput,
  window: { opensAt: Date; closesAt: Date; candidateCount: number },
) {
  if (input.chainId !== 31337 || !localPrivateTestingEnabled())
    throw new ApiError(409, 'Local private testing requires chain ID 31337 and development mode', 'PRIVATE_TEST_ONLY');
  const addresses = [input.maciAddress, input.pollAddress, input.tallyAddress,
    input.messageProcessorAddress, input.gateAddress, input.voiceCreditProxyAddress];
  if (!addresses.every((address) => isAddress(address)) || !/^\d+$/.test(input.pollId) || !/^\d+$/.test(input.deploymentBlock))
    throw new ApiError(400, 'Invalid private poll deployment');
  const [maciAddress, pollAddress, tallyAddress, messageProcessorAddress, gateAddress, voiceCreditProxyAddress] = addresses as Address[];
  const client = localClient();
  try {
    if (await client.getChainId() !== 31337) throw new Error('wrong chain');
    const codes = await Promise.all(addresses.map((address) => client.getCode({ address: address as Address })));
    if (codes.some((code) => !code || code === '0x')) throw new Error('missing contract');
    const signupPolicy = await client.readContract({ address: maciAddress, abi: maciAbi, functionName: 'signUpPolicy' });
    if (!await client.getCode({ address: signupPolicy })) throw new Error('missing signup policy');
    const [pollContracts, pollMaci, dates, coordinator, voteOptions, extContracts, gateMaci, policyGate, policyTarget, voiceCredits, mode] = await Promise.all([
      client.readContract({ address: maciAddress, abi: maciAbi, functionName: 'getPoll', args: [BigInt(input.pollId)] }),
      client.readContract({ address: pollAddress, abi: pollAbi, functionName: 'getMaciContract' }),
      client.readContract({ address: pollAddress, abi: pollAbi, functionName: 'getStartAndEndDate' }),
      client.readContract({ address: pollAddress, abi: pollAbi, functionName: 'coordinatorPublicKey' }),
      client.readContract({ address: pollAddress, abi: pollAbi, functionName: 'voteOptions' }),
      client.readContract({ address: pollAddress, abi: pollAbi, functionName: 'extContracts' }),
      client.readContract({ address: gateAddress, abi: gateAbi, functionName: 'maci' }),
      client.readContract({ address: signupPolicy, abi: policyAbi, functionName: 'gate' }).catch(() => ''),
      client.readContract({ address: signupPolicy, abi: policyAbi, functionName: 'guarded' }).catch(() => ''),
      client.readContract({ address: voiceCreditProxyAddress, abi: creditsAbi, functionName: 'getVoiceCredits', args: [gateAddress, '0x'] }),
      client.readContract({ address: tallyAddress, abi: tallyAbi, functionName: 'mode' }),
    ]);
    const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
    if (!same(pollContracts.poll, pollAddress) || !same(pollContracts.tally, tallyAddress) ||
      !same(pollContracts.messageProcessor, messageProcessorAddress) || !same(pollMaci, maciAddress) ||
      !same(gateMaci, maciAddress) || !same(policyGate, gateAddress) || !same(policyTarget, maciAddress) ||
      !same(extContracts[0], maciAddress) || !same(extContracts[4], voiceCreditProxyAddress) ||
      dates[0] !== BigInt(Math.floor(window.opensAt.getTime() / 1000)) ||
      dates[1] !== BigInt(Math.floor(window.closesAt.getTime() / 1000)) ||
      voteOptions !== BigInt(window.candidateCount) || voiceCredits !== 100n || BigInt(mode) !== 1n)
      throw new Error('deployment mismatch');
    return { coordinatorPublicKeyX: coordinator[0].toString(), coordinatorPublicKeyY: coordinator[1].toString() };
  } catch {
    throw new ApiError(409, 'Private poll contracts do not match this election', 'PRIVATE_DEPLOYMENT_MISMATCH');
  }
}

export async function registerLocalTestPublicKey(input: {
  gateAddress: string;
  maciAddress: string;
  deploymentBlock: string;
  testNullifier: Hex;
  publicKeyX: bigint;
  publicKeyY: bigint;
}) {
  const { client, account, wallet } = await localRelayer();
  const gateAddress = input.gateAddress as Address;
  const owner = await client.readContract({ address: gateAddress, abi: localSignupAbi, functionName: 'owner' });
  if (owner.toLowerCase() !== account.address.toLowerCase())
    throw new ApiError(503, 'Local private-voting relayer does not own the test gate', 'PRIVATE_RELAYER_MISMATCH');
  const findRecordedSignup = async () => {
    const logs = await client.getLogs({ address: gateAddress, event: localSignupAbi[3],
      args: { testNullifier: input.testNullifier }, fromBlock: BigInt(input.deploymentBlock) });
    const recorded = logs[0];
    if (!recorded) return null;
    if (recorded.args.publicKeyX !== input.publicKeyX || recorded.args.publicKeyY !== input.publicKeyY)
      throw new ApiError(409, 'This test identity already registered another MACI key', 'PRIVATE_KEY_CHANGED');
    const receipt = await client.getTransactionReceipt({ hash: recorded.transactionHash });
    const signups = parseEventLogs({ abi: maciSignupAbi, logs: receipt.logs });
    const signup = signups.find((log) => log.address.toLowerCase() === input.maciAddress.toLowerCase() &&
      log.args._userPublicKeyX === input.publicKeyX && log.args._userPublicKeyY === input.publicKeyY);
    if (!signup || signup.args._stateIndex > BigInt(2_147_483_647))
      throw new ApiError(503, 'Could not reconcile MACI signup', 'PRIVATE_SIGNUP_RECONCILE');
    return { signupTxHash: recorded.transactionHash, stateIndex: Number(signup.args._stateIndex) };
  };
  if (await client.readContract({ address: gateAddress, abi: localSignupAbi, functionName: 'usedTestNullifiers', args: [input.testNullifier] })) {
    const existing = await findRecordedSignup();
    if (existing) return existing;
    throw new ApiError(503, 'MACI signup is pending; retry after it is mined', 'PRIVATE_SIGNUP_PENDING');
  }
  try {
    const simulation = await client.simulateContract({ account, address: gateAddress, abi: localSignupAbi,
      functionName: 'signUpFor', args: [input.testNullifier, { x: input.publicKeyX, y: input.publicKeyY }] });
    const hash = await wallet.writeContract(simulation.request);
    await client.waitForTransactionReceipt({ hash, timeout: 15_000 });
  } catch (error) {
    const recovered = await findRecordedSignup();
    if (recovered) return recovered;
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, 'MACI signup failed or is still pending; retry safely', 'PRIVATE_SIGNUP_RETRY');
  }
  const recorded = await findRecordedSignup();
  if (!recorded) throw new ApiError(503, 'MACI signup receipt is unavailable; retry safely', 'PRIVATE_SIGNUP_RETRY');
  return recorded;
}

export async function findLocalPollJoin(input: {
  chainId?: number;
  pollAddress: string;
  deploymentBlock: string;
  publicKeyX: bigint;
  publicKeyY: bigint;
}) {
  const chainId = input.chainId ?? 31337;
  const client = privateClient(chainId);
  if (await client.getChainId() !== chainId)
    throw new ApiError(503, 'Private-voting RPC is on the wrong chain', 'PRIVATE_WRONG_CHAIN');
  const logs = await client.getLogs({ address: input.pollAddress as Address, event: pollVotingAbi[2],
    args: { _pollPublicKeyX: input.publicKeyX, _pollPublicKeyY: input.publicKeyY },
    fromBlock: BigInt(input.deploymentBlock) });
  const joined = logs.find((log) => log.args._voiceCreditBalance === 100n &&
    log.args._pollStateIndex !== undefined && log.args._pollStateIndex <= BigInt(2_147_483_647));
  return joined ? {
    pollStateIndex: Number(joined.args._pollStateIndex), joinTxHash: joined.transactionHash,
    nullifier: joined.args._nullifier,
  } : null;
}

export async function localPollJoiningData(input: { chainId?: number; maciAddress: string; deploymentBlock: string }) {
  const chainId = input.chainId ?? 31337;
  if (chainId === 31337 && !localPrivateTestingEnabled())
    throw new ApiError(403, 'Local private voting is disabled outside development', 'PRIVATE_TEST_ONLY');
  const client = privateClient(chainId);
  if (await client.getChainId() !== chainId)
    throw new ApiError(503, 'Private-voting RPC is on the wrong chain', 'PRIVATE_WRONG_CHAIN');
  const address = input.maciAddress as Address;
  const [depth, totalSignups] = await Promise.all([
    client.readContract({ address, abi: maciAbi, functionName: 'stateTreeDepth' }),
    client.readContract({ address, abi: maciAbi, functionName: 'totalSignups' }),
  ]);
  if (totalSignups < 2n || totalSignups > 1024n || depth > 10)
    throw new ApiError(409, 'Local test poll has an unsupported signup tree', 'PRIVATE_TREE_UNSUPPORTED');
  const stateRootIndex = totalSignups - 1n;
  const [root, logs] = await Promise.all([
    client.readContract({ address, abi: maciAbi, functionName: 'getStateRootOnIndexedSignUp',
      args: [stateRootIndex] }),
    client.getLogs({ address, event: maciSignupAbi[0], fromBlock: BigInt(input.deploymentBlock) }),
  ]);
  if (BigInt(logs.length) !== stateRootIndex)
    throw new ApiError(503, 'MACI signup events are incomplete', 'PRIVATE_TREE_INCOMPLETE');
  return { stateTreeDepth: Number(depth), stateRootIndex: Number(stateRootIndex),
    stateRoot: root.toString(), signups: logs.map((log) => ({
      publicKeyX: log.args._userPublicKeyX!.toString(),
      publicKeyY: log.args._userPublicKeyY!.toString(),
    })) };
}

export async function joinLocalPrivatePoll(input: {
  chainId?: number;
  pollAddress: string;
  deploymentBlock: string;
  publicKeyX: bigint;
  publicKeyY: bigint;
  nullifier: bigint;
  stateRootIndex: bigint;
  proof: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
}) {
  const { client, account, wallet } = await privateRelayer(input.chainId ?? 31337);
  const previous = await findLocalPollJoin(input);
  if (previous) {
    if (previous.nullifier !== input.nullifier)
      throw new ApiError(409, 'This MACI key has already joined the poll', 'PRIVATE_ALREADY_JOINED');
    return { pollStateIndex: previous.pollStateIndex, joinTxHash: previous.joinTxHash };
  }
  try {
    const simulation = await client.simulateContract({ account, address: input.pollAddress as Address,
      abi: pollVotingAbi, functionName: 'joinPoll', args: [input.nullifier,
        { x: input.publicKeyX, y: input.publicKeyY }, input.stateRootIndex,
        input.proof, '0x', '0x'] });
    const hash = await wallet.writeContract(simulation.request);
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: 30_000 });
    if (receipt.status !== 'success') throw new Error('Poll join reverted');
  } catch {
    const recovered = await findLocalPollJoin(input);
    if (recovered && recovered.nullifier === input.nullifier)
      return { pollStateIndex: recovered.pollStateIndex, joinTxHash: recovered.joinTxHash };
    throw new ApiError(503, 'MACI poll join failed or is pending; retry safely', 'PRIVATE_JOIN_RETRY');
  }
  const joined = await findLocalPollJoin(input);
  if (!joined || joined.nullifier !== input.nullifier)
    throw new ApiError(503, 'MACI poll join receipt is unavailable; retry safely', 'PRIVATE_JOIN_RETRY');
  return { pollStateIndex: joined.pollStateIndex, joinTxHash: joined.joinTxHash };
}

export async function publishLocalPrivateMessage(input: {
  chainId?: number;
  pollAddress: string;
  data: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
  encryptionPublicKeyX: bigint;
  encryptionPublicKeyY: bigint;
}) {
  const { client, account, wallet } = await privateRelayer(input.chainId ?? 31337);
  try {
    const simulation = await client.simulateContract({ account, address: input.pollAddress as Address,
      abi: pollVotingAbi, functionName: 'publishMessage', args: [
        { data: input.data },
        { x: input.encryptionPublicKeyX, y: input.encryptionPublicKeyY },
      ] });
    const hash = await wallet.writeContract(simulation.request);
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: 30_000 });
    if (receipt.status !== 'success') throw new Error('Message reverted');
    return { txHash: hash };
  } catch {
    throw new ApiError(503, 'Encrypted MACI message was not confirmed; inspect the chain before retrying',
      'PRIVATE_MESSAGE_UNCERTAIN');
  }
}

export function checkedPrivateTotals(results: readonly { value: bigint; isSet: boolean }[], spent: bigint) {
  const sum = results.reduce((total, result) => total + result.value, 0n);
  if (results.some((result) => !result.isSet) || sum !== spent ||
    spent > BigInt(Number.MAX_SAFE_INTEGER) ||
    results.some((result) => result.value > BigInt(Number.MAX_SAFE_INTEGER)))
    throw new ApiError(409, 'On-chain MACI tally is incomplete or inconsistent', 'PRIVATE_TALLY_MISMATCH');
  // With 100 non-quadratic credits per person, 300 counted units require at least 3 voters.
  if (spent < 300n)
    throw new ApiError(409, 'At least three counted voters are required before publishing results',
      'PRIVATE_SMALL_POLL');
  return results.map((result) => result.value.toString());
}

/** Only values MACI has verified and stored on-chain may become public results. */
export async function verifiedLocalPrivateTally(input: { chainId?: number; tallyAddress: string; candidateCount: number }) {
  const chainId = input.chainId ?? 31337;
  if (chainId === 31337 && !localPrivateTestingEnabled())
    throw new ApiError(403, 'Local private voting is disabled outside development', 'PRIVATE_TEST_ONLY');
  const client = privateClient(chainId);
  if (await client.getChainId() !== chainId)
    throw new ApiError(503, 'Private-voting RPC is on the wrong chain', 'PRIVATE_WRONG_CHAIN');
  const address = input.tallyAddress as Address;
  const [tallied, mode, resultCount, spent, commitment] = await Promise.all([
    client.readContract({ address, abi: tallyAbi, functionName: 'isTallied' }),
    client.readContract({ address, abi: tallyAbi, functionName: 'mode' }),
    client.readContract({ address, abi: tallyAbi, functionName: 'totalTallyResults' }),
    client.readContract({ address, abi: tallyAbi, functionName: 'totalSpent' }),
    client.readContract({ address, abi: tallyAbi, functionName: 'tallyCommitment' }),
  ]);
  if (!tallied || BigInt(mode) !== 1n || resultCount !== BigInt(input.candidateCount) || commitment === 0n)
    throw new ApiError(409, 'MACI tally and per-option proofs are not finalized on-chain', 'PRIVATE_TALLY_PENDING');
  const results = await Promise.all(Array.from({ length: input.candidateCount }, (_, index) =>
    client.readContract({ address, abi: tallyAbi, functionName: 'getTallyResults', args: [BigInt(index)] })));
  return { candidateUnits: checkedPrivateTotals(results, spent),
    totalSpent: spent.toString(), tallyCommitment: commitment.toString() };
}
