import {
  BaseError, RawContractError, createPublicClient, createWalletClient, decodeErrorResult,
  encodeFunctionData, getAddress, http,
  TransactionReceiptNotFoundError, type Abi, type Address, type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import votingAbiJson from './chain/abi.json';
import { chainActionSchema } from './chain/action';
import { classifyRevert } from './chain/rejection';
import type { BlockchainAdapter } from './blockchain';

const abi = votingAbiJson as Abi;
const commitmentHex = (value: string): Hex => {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error('Invalid audit commitment');
  return `0x${value}`;
};

export function encodeChainAction(commitment: string, actionJson?: string | null): Hex {
  const auditCommitment = commitmentHex(commitment);
  if (!actionJson)
    return encodeFunctionData({ abi, functionName: 'anchorAudit', args: [auditCommitment] });
  const action = chainActionSchema.parse(JSON.parse(actionJson));
  if (action.kind === 'CAST') {
    const { opensAt, closesAt, policy } = action.config;
    return encodeFunctionData({ abi, functionName: 'castVote', args: [
      action.electionKey as Hex, action.nullifier as Hex, action.candidateCommitment as Hex,
      auditCommitment, BigInt(opensAt), BigInt(closesAt), policy,
    ] });
  }
  if (action.kind === 'CLOSE')
    return encodeFunctionData({ abi, functionName: 'closeElection', args: [
      action.electionKey as Hex, auditCommitment,
    ] });
  return encodeFunctionData({ abi, functionName: 'recallVote', args: [
    action.electionKey as Hex, action.nullifier as Hex, action.full, auditCommitment,
  ] });
}

export class SepoliaBlockchainAdapter implements BlockchainAdapter {
  readonly name = 'SEPOLIA';
  private readonly rpc: string;
  private readonly address: Address;
  private readonly deploymentBlock: bigint;
  private readonly account: ReturnType<typeof privateKeyToAccount>;

  constructor(env: Record<string, string | undefined> = process.env) {
    const rpc = env.BLOCKCHAIN_SEPOLIA_RPC_URL;
    const key = env.BLOCKCHAIN_SIGNER_PRIVATE_KEY;
    const address = env.BLOCKCHAIN_CONTRACT_ADDRESS;
    if (!rpc?.startsWith('https://') || !/^0x[a-fA-F0-9]{64}$/.test(key ?? '') ||
        !/^0x[a-fA-F0-9]{40}$/.test(address ?? ''))
      throw new Error('Sepolia RPC, signer and deployed contract address must be configured');
    if (!/^\d+$/.test(env.BLOCKCHAIN_CONTRACT_DEPLOYMENT_BLOCK ?? '0'))
      throw new Error('Invalid contract deployment block');
    this.rpc = rpc;
    this.account = privateKeyToAccount(key as Hex);
    this.address = getAddress(address as Address);
    this.deploymentBlock = BigInt(env.BLOCKCHAIN_CONTRACT_DEPLOYMENT_BLOCK ?? '0');
  }

  private publicClient() {
    return createPublicClient({ chain: sepolia, transport: http(this.rpc) });
  }

  private async existingHash(commitment: Hex, actionJson?: string | null): Promise<Hex | null> {
    const action = actionJson ? chainActionSchema.parse(JSON.parse(actionJson)) : null;
    const eventName = action?.kind === 'CAST' ? 'VoteCast'
      : action?.kind === 'RECALL' ? 'VoteRecalled'
        : action?.kind === 'CLOSE' ? 'ElectionClosed' : 'AuditAnchored';
    const logs = await this.publicClient().getContractEvents({
      address: this.address, abi, eventName, args: { auditCommitment: commitment },
      fromBlock: this.deploymentBlock,
    });
    return logs[0]?.transactionHash ?? null;
  }

  async submit(commitment: string, actionJson?: string | null) {
    const auditCommitment = commitmentHex(commitment);
    const data = encodeChainAction(commitment, actionJson);
    const applied = await this.publicClient().readContract({
      address: this.address, abi, functionName: 'appliedActions', args: [auditCommitment],
    });
    if (applied === true) {
      const prior = await this.existingHash(auditCommitment, actionJson);
      if (!prior) throw new Error('Applied action has no discoverable transaction');
      return { receipt: `sepolia:${prior}` };
    }
    await this.rejectIfReverts(data);
    const publicClient = this.publicClient();
    const wallet = createWalletClient({ account: this.account, chain: sepolia, transport: http(this.rpc) });
    // Only one action is ever in flight. If the relayer has a transaction still pending, this send is a
    // retry of it: reuse its nonce with higher fees so it replaces the stuck one instead of queueing behind it.
    const [latest, pending] = await Promise.all([
      publicClient.getTransactionCount({ address: this.account.address, blockTag: 'latest' }),
      publicClient.getTransactionCount({ address: this.account.address, blockTag: 'pending' }),
    ]);
    const replacing = pending > latest;
    const fees = replacing ? await publicClient.estimateFeesPerGas() : undefined;
    const hash = await wallet.sendTransaction({
      to: this.address, value: 0n, data, nonce: latest,
      ...(fees?.maxFeePerGas ? {
        maxFeePerGas: fees.maxFeePerGas * 2n,
        maxPriorityFeePerGas: (fees.maxPriorityFeePerGas ?? 1_000_000_000n) * 2n,
      } : {}),
    });
    return { receipt: `sepolia:${hash}` };
  }

  /** Simulates the call; a known contract-rule revert is reported instead of burning gas on it. */
  private async rejectIfReverts(data: Hex) {
    try {
      await this.publicClient().call({ account: this.account.address, to: this.address, data });
    } catch (error) {
      const raw = error instanceof BaseError ? error.walk((item) => item instanceof RawContractError) : null;
      const revert = raw instanceof RawContractError
        ? (typeof raw.data === 'string' ? raw.data : raw.data?.data) : undefined;
      if (!revert) throw error;
      let name: string;
      try { name = decodeErrorResult({ abi, data: revert as Hex }).errorName; }
      catch { throw error; }
      const rejection = classifyRevert(name);
      if (rejection) throw rejection;
      throw error;
    }
  }

  async confirm(receipt: string, commitment: string, actionJson?: string | null): Promise<'pending' | 'confirmed' | 'failed'> {
    if (!/^sepolia:0x[a-f0-9]{64}$/.test(receipt)) return 'failed';
    const expectedInput = encodeChainAction(commitment, actionJson);
    const hash = receipt.slice('sepolia:'.length) as Hex;
    const publicClient = this.publicClient();
    try {
      const mined = await publicClient.getTransactionReceipt({ hash });
      if (mined.status !== 'success') return 'failed';
      const transaction = await publicClient.getTransaction({ hash });
      if (transaction.to?.toLowerCase() !== this.address.toLowerCase() ||
          transaction.input.toLowerCase() !== expectedInput.toLowerCase()) return 'failed';
      const applied = await publicClient.readContract({
        address: this.address, abi, functionName: 'appliedActions', args: [commitmentHex(commitment)],
      });
      return applied === true ? 'confirmed' : 'failed';
    } catch (error) {
      if (error instanceof TransactionReceiptNotFoundError) return 'pending';
      throw error;
    }
  }
}
