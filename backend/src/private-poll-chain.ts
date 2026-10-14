import { createPublicClient, createWalletClient, defineChain, http, isAddress, parseAbi, parseEventLogs, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ApiError } from './errors';

const maciAbi = [
  { type: 'function', name: 'getPoll', stateMutability: 'view', inputs: [{ name: 'pollId', type: 'uint256' }], outputs: [{ type: 'tuple', components: [{ name: 'poll', type: 'address' }, { name: 'messageProcessor', type: 'address' }, { name: 'tally', type: 'address' }] }] },
  { type: 'function', name: 'signUpPolicy', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
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

function localClient() {
  const rpc = process.env.PRIVATE_VOTING_RPC_URL;
  if (!rpc || !/^https?:\/\//.test(rpc))
    throw new ApiError(503, 'Local private-voting RPC is not configured', 'PRIVATE_RPC_MISSING');
  return createPublicClient({ transport: http(rpc, { timeout: 8_000 }) });
}

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
  if (!localPrivateTestingEnabled())
    throw new ApiError(403, 'Local registration is disabled outside development', 'PRIVATE_TEST_ONLY');
  const rpc = process.env.PRIVATE_VOTING_RPC_URL;
  const signer = process.env.PRIVATE_VOTING_SIGNER_PRIVATE_KEY;
  if (!rpc || !/^0x[a-fA-F0-9]{64}$/.test(signer ?? ''))
    throw new ApiError(503, 'Local private-voting relayer is not configured', 'PRIVATE_RELAYER_MISSING');
  const account = privateKeyToAccount(signer as Hex);
  const client = localClient();
  if (await client.getChainId() !== 31337)
    throw new ApiError(503, 'Local private-voting RPC is on the wrong chain', 'PRIVATE_WRONG_CHAIN');
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
  const chain = defineChain({ id: 31337, name: 'Local MACI test',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [rpc] } } });
  const wallet = createWalletClient({ account, chain, transport: http(rpc, { timeout: 8_000 }) });
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
