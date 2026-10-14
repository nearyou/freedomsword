import { isAddress, keccak256, parseAbi, stringToHex, type Address, type Hex } from 'viem';
import { ApiError } from './errors';
import { privateClient, privateRelayer, type PrivatePollInput } from './private-poll-chain';

const maciAbi = parseAbi([
  'function getPoll(uint256) view returns ((address poll,address messageProcessor,address tally))',
  'function signUpPolicy() view returns (address)',
]);
const pollAbi = parseAbi([
  'function getStartAndEndDate() view returns (uint256,uint256)',
  'function getMaciContract() view returns (address)',
  'function coordinatorPublicKey() view returns (uint256,uint256)',
  'function voteOptions() view returns (uint256)',
  'function extContracts() view returns (address,address,address,address,address)',
]);
const policyAbi = parseAbi([
  'function gate() view returns (address)',
  'function guarded() view returns (address)',
]);
const creditsAbi = parseAbi(['function getVoiceCredits(address,bytes) view returns (uint256)']);
const tallyAbi = parseAbi(['function mode() view returns (uint8)']);
const gateAbi = parseAbi([
  'function maci() view returns (address)',
  'function registry() view returns (address)',
  'function verifier() view returns (address)',
  'function electionId() view returns (uint256)',
  'function closesAt() view returns (uint256)',
  'function SELECTOR() view returns (uint256)',
  'function eventData((uint256 x,uint256 y),bytes32) view returns (uint256)',
  'function ageUpperBound(uint256) pure returns (uint256)',
  'function register((uint256 x,uint256 y),bytes32,uint256[23],uint256[2],uint256[2][2],uint256[2])',
  'function usedNullifiers(uint256) view returns (bool)',
]);
const signupEvent = parseAbi([
  'event RarimoSignup(uint256 indexed nullifier,uint256 publicKeyX,uint256 publicKeyY)',
])[0];
const field = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
const decimal = /^(0|[1-9][0-9]{0,77})$/;

export function rarimoEventId(electionId: string) {
  // The election ID is an opaque UUID. Hashing it gives an election-scoped
  // Rarimo nullifier domain without disclosing the app's database key.
  return BigInt(keccak256(stringToHex(electionId))) % field;
}

export function encodeRarimoDate(date: Date) {
  const digits = `${String(date.getUTCFullYear() % 100).padStart(2, '0')}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`;
  return { digits, encoded: BigInt(`0x${Buffer.from(digits, 'ascii').toString('hex')}`) };
}

function decodeRarimoDate(encoded: bigint) {
  const text = Buffer.from(encoded.toString(16).padStart(12, '0'), 'hex').toString('ascii');
  if (!/^\d{6}$/.test(text)) throw new ApiError(503, 'Rarimo gate returned an invalid date');
  return text;
}

function proofDateHex(digits: string) {
  return `0x${Buffer.from(digits, 'ascii').toString('hex')}`;
}

export async function validateRarimoPrivatePoll(
  input: PrivatePollInput,
  window: { electionId: string; opensAt: Date; closesAt: Date; candidateCount: number },
) {
  if (input.chainId !== 7368 || ![input.maciAddress, input.pollAddress, input.tallyAddress,
    input.messageProcessorAddress, input.gateAddress, input.voiceCreditProxyAddress].every((address) => isAddress(address)) ||
    !decimal.test(input.pollId) || !decimal.test(input.deploymentBlock))
    throw new ApiError(400, 'Rarimo poll must use a valid deployment on chain 7368');
  const client = privateClient(7368);
  const [maci, poll, tally, processor, gate, credits] = [input.maciAddress, input.pollAddress,
    input.tallyAddress, input.messageProcessorAddress, input.gateAddress,
    input.voiceCreditProxyAddress] as Address[];
  try {
    if (await client.getChainId() !== 7368) throw new Error('wrong chain');
    const codes = await Promise.all([maci, poll, tally, processor, gate, credits].map((address) => client.getCode({ address })));
    if (codes.some((code) => !code || code === '0x')) throw new Error('missing contract');
    const policy = await client.readContract({ address: maci, abi: maciAbi, functionName: 'signUpPolicy' });
    const policyCode = await client.getCode({ address: policy });
    const [contracts, pollMaci, dates, coordinator, options, extensions, policyGate,
      policyTarget, gateMaci, registry, verifier, eventId, closesAt, selector, voiceCredits, mode] = await Promise.all([
      client.readContract({ address: maci, abi: maciAbi, functionName: 'getPoll', args: [BigInt(input.pollId)] }),
      client.readContract({ address: poll, abi: pollAbi, functionName: 'getMaciContract' }),
      client.readContract({ address: poll, abi: pollAbi, functionName: 'getStartAndEndDate' }),
      client.readContract({ address: poll, abi: pollAbi, functionName: 'coordinatorPublicKey' }),
      client.readContract({ address: poll, abi: pollAbi, functionName: 'voteOptions' }),
      client.readContract({ address: poll, abi: pollAbi, functionName: 'extContracts' }),
      client.readContract({ address: policy, abi: policyAbi, functionName: 'gate' }),
      client.readContract({ address: policy, abi: policyAbi, functionName: 'guarded' }),
      client.readContract({ address: gate, abi: gateAbi, functionName: 'maci' }),
      client.readContract({ address: gate, abi: gateAbi, functionName: 'registry' }),
      client.readContract({ address: gate, abi: gateAbi, functionName: 'verifier' }),
      client.readContract({ address: gate, abi: gateAbi, functionName: 'electionId' }),
      client.readContract({ address: gate, abi: gateAbi, functionName: 'closesAt' }),
      client.readContract({ address: gate, abi: gateAbi, functionName: 'SELECTOR' }),
      client.readContract({ address: credits, abi: creditsAbi, functionName: 'getVoiceCredits', args: [gate, '0x'] }),
      client.readContract({ address: tally, abi: tallyAbi, functionName: 'mode' }),
    ]);
    const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
    const registryCode = await client.getCode({ address: registry });
    const verifierCode = await client.getCode({ address: verifier });
    if (!same(contracts.poll, poll) || !same(contracts.tally, tally) ||
      !same(contracts.messageProcessor, processor) || !same(pollMaci, maci) ||
      !same(policyGate, gate) || !same(policyTarget, maci) || !same(gateMaci, maci) ||
      !same(extensions[0], maci) || !same(extensions[4], credits) ||
      dates[0] !== BigInt(Math.floor(window.opensAt.getTime() / 1000)) ||
      dates[1] !== BigInt(Math.floor(window.closesAt.getTime() / 1000)) ||
      closesAt !== dates[1] || options !== BigInt(window.candidateCount) ||
      eventId !== rarimoEventId(window.electionId) || selector !== 38945n ||
      voiceCredits !== 100n || BigInt(mode) !== 1n ||
      !registryCode || !verifierCode || !policyCode ||
      !isAddress(process.env.RARIMO_REGISTRY_ADDRESS ?? '') ||
      !same(registry, process.env.RARIMO_REGISTRY_ADDRESS!) ||
      !isAddress(process.env.RARIMO_GATE_ADDRESS ?? '') ||
      !same(gate, process.env.RARIMO_GATE_ADDRESS!))
      throw new Error('deployment mismatch');
    // A lookalike verifier, gate, or signup policy could bypass eligibility.
    // Pin their exact deployed runtime code before opening registration.
    const expectedVerifierHash = process.env.RARIMO_VERIFIER_CODE_HASH;
    const expectedGateHash = process.env.RARIMO_GATE_CODE_HASH;
    const expectedPolicyHash = process.env.RARIMO_POLICY_CODE_HASH;
    if (!/^0x[a-fA-F0-9]{64}$/.test(expectedVerifierHash ?? '') ||
      !/^0x[a-fA-F0-9]{64}$/.test(expectedGateHash ?? '') ||
      !/^0x[a-fA-F0-9]{64}$/.test(expectedPolicyHash ?? '') ||
      keccak256(verifierCode) !== expectedVerifierHash!.toLowerCase() ||
      keccak256(codes[4]!) !== expectedGateHash!.toLowerCase() ||
      keccak256(policyCode) !== expectedPolicyHash!.toLowerCase())
      throw new Error('untrusted private-voting contract');
    return { coordinatorPublicKeyX: coordinator[0].toString(),
      coordinatorPublicKeyY: coordinator[1].toString() };
  } catch {
    throw new ApiError(409, 'Rarimo gate and MACI contracts do not match this election',
      'RARIMO_DEPLOYMENT_MISMATCH');
  }
}

export async function rarimoProofRequest(input: {
  gateAddress: string;
  publicKeyX: bigint;
  publicKeyY: bigint;
  accountCommitment: Hex;
}) {
  const client = privateClient(7368);
  if (await client.getChainId() !== 7368)
    throw new ApiError(503, 'Rarimo RPC is on the wrong chain', 'PRIVATE_WRONG_CHAIN');
  const gate = input.gateAddress as Address;
  const today = encodeRarimoDate(new Date());
  const [eventId, eventData, ageBound, selector] = await Promise.all([
    client.readContract({ address: gate, abi: gateAbi, functionName: 'electionId' }),
    client.readContract({ address: gate, abi: gateAbi, functionName: 'eventData',
      args: [{ x: input.publicKeyX, y: input.publicKeyY }, input.accountCommitment] }),
    client.readContract({ address: gate, abi: gateAbi, functionName: 'ageUpperBound', args: [today.encoded] }),
    client.readContract({ address: gate, abi: gateAbi, functionName: 'SELECTOR' }),
  ]);
  if (selector !== 38945n) throw new ApiError(409, 'Unsupported Rarimo gate policy');
  return { eventId: eventId.toString(), selector: selector.toString(),
    citizenshipMask: 'UKR', sex: '',
    eventData: `0x${eventData.toString(16)}`,
    identityCounterLowerBound: '0', identityCounterUpperBound: '1',
    timestampLowerBound: '0', timestampUpperBound: '0',
    birthDateLowerBound: proofDateHex('000000'),
    birthDateUpperBound: proofDateHex(decodeRarimoDate(ageBound)),
    expirationDateLowerBound: proofDateHex(today.digits),
    expirationDateUpperBound: proofDateHex('000000') };
}

export type RarimoProof = {
  pubSignals: string[];
  proof: { piA: string[]; piB: string[][]; piC: string[] };
};

export function compactRarimoProof(proof: RarimoProof) {
  if (proof.pubSignals.length !== 23 || proof.proof.piA.length < 2 ||
    proof.proof.piB.length < 2 || proof.proof.piC.length < 2 ||
    proof.proof.piB.slice(0, 2).some((row) => row.length < 2) ||
    [...proof.pubSignals, ...proof.proof.piA.slice(0, 2), ...proof.proof.piC.slice(0, 2),
      ...proof.proof.piB[0].slice(0, 2), ...proof.proof.piB[1].slice(0, 2)]
      .some((value) => !decimal.test(value)))
    throw new ApiError(400, 'Invalid Rarimo proof format', 'RARIMO_PROOF_FORMAT');
  return { signals: proof.pubSignals.map(BigInt) as bigint[],
    a: [BigInt(proof.proof.piA[0]), BigInt(proof.proof.piA[1])] as const,
    b: [[BigInt(proof.proof.piB[0][1]), BigInt(proof.proof.piB[0][0])],
      [BigInt(proof.proof.piB[1][1]), BigInt(proof.proof.piB[1][0])]] as const,
    c: [BigInt(proof.proof.piC[0]), BigInt(proof.proof.piC[1])] as const };
}

export async function registerRarimoPublicKey(input: {
  gateAddress: string; maciAddress: string; deploymentBlock: string;
  publicKeyX: bigint; publicKeyY: bigint; accountCommitment: Hex; proof: RarimoProof;
}) {
  const parsed = compactRarimoProof(input.proof);
  const nullifier = parsed.signals[0];
  if (!nullifier || nullifier === 0n)
    throw new ApiError(400, 'Rarimo proof has no nullifier');
  const { client, account, wallet } = await privateRelayer(7368);
  const gate = input.gateAddress as Address;
  const expectedEventData = await client.readContract({ address: gate, abi: gateAbi,
    functionName: 'eventData', args: [{ x: input.publicKeyX, y: input.publicKeyY },
      input.accountCommitment] });
  if (parsed.signals[10] !== expectedEventData)
    throw new ApiError(403, 'Rarimo proof belongs to another account or MACI key',
      'RARIMO_ACCOUNT_MISMATCH');
  const find = async () => {
    if (!await client.readContract({ address: gate, abi: gateAbi,
      functionName: 'usedNullifiers', args: [nullifier] })) return null;
    const deployment = BigInt(input.deploymentBlock);
    let recorded: { args: { publicKeyX?: bigint; publicKeyY?: bigint };
      transactionHash: Hex } | undefined;
    for (let end = await client.getBlockNumber(); end >= deployment;) {
      const start = end - deployment >= 4_999n ? end - 4_999n : deployment;
      const logs = await client.getLogs({ address: gate, event: signupEvent,
        args: { nullifier }, fromBlock: start, toBlock: end });
      if (logs[0]?.transactionHash) {
        recorded = { args: logs[0].args, transactionHash: logs[0].transactionHash };
        break;
      }
      if (start === deployment) break;
      end = start - 1n;
    }
    if (!recorded) return null;
    if (recorded.args.publicKeyX !== input.publicKeyX ||
      recorded.args.publicKeyY !== input.publicKeyY)
      throw new ApiError(409, 'Rarimo identity already registered another MACI key', 'RARIMO_REPLAY');
    const receipt = await client.getTransactionReceipt({ hash: recorded.transactionHash });
    const maciSignupAbi = parseAbi([
      'event SignUp(uint256 _stateIndex,uint256 _timestamp,uint256 indexed _userPublicKeyX,uint256 indexed _userPublicKeyY)',
    ]);
    const { parseEventLogs } = await import('viem');
    const signups = parseEventLogs({ abi: maciSignupAbi, logs: receipt.logs });
    const signup = signups.find((item) => item.address.toLowerCase() === input.maciAddress.toLowerCase() &&
      item.args._userPublicKeyX === input.publicKeyX && item.args._userPublicKeyY === input.publicKeyY);
    if (!signup || signup.args._stateIndex > BigInt(2_147_483_647))
      throw new ApiError(503, 'Rarimo signup could not be reconciled');
    return { signupTxHash: recorded.transactionHash, stateIndex: Number(signup.args._stateIndex),
      nullifier: nullifier.toString() };
  };
  const prior = await find();
  if (prior) return prior;
  try {
    const simulation = await client.simulateContract({ account, address: gate, abi: gateAbi,
      functionName: 'register', args: [{ x: input.publicKeyX, y: input.publicKeyY },
        input.accountCommitment,
        parsed.signals as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
          bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
          bigint, bigint, bigint, bigint, bigint, bigint],
        parsed.a, parsed.b, parsed.c] });
    const hash = await wallet.writeContract(simulation.request);
    const receipt = await client.waitForTransactionReceipt({ hash, timeout: 60_000 });
    if (receipt.status !== 'success') throw new Error('Rarimo signup reverted');
  } catch (error) {
    const recovered = await find();
    if (recovered) return recovered;
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, 'Rarimo signup failed or is pending; retry safely', 'RARIMO_SIGNUP_RETRY');
  }
  const result = await find();
  if (!result) throw new ApiError(503, 'Rarimo signup receipt unavailable; retry safely');
  return result;
}
