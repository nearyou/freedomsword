import { createPublicClient, createWalletClient, http, TransactionReceiptNotFoundError, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import type { BlockchainAdapter } from './blockchain';

export class SepoliaBlockchainAdapter implements BlockchainAdapter {
  readonly name = 'SEPOLIA';
  private readonly rpc: string;
  private readonly account: ReturnType<typeof privateKeyToAccount>;

  constructor(env: Record<string, string | undefined> = process.env) {
    const rpc = env.BLOCKCHAIN_SEPOLIA_RPC_URL;
    const key = env.BLOCKCHAIN_SIGNER_PRIVATE_KEY;
    if (!rpc || !rpc.startsWith('https://') || !/^0x[a-fA-F0-9]{64}$/.test(key ?? ''))
      throw new Error('Sepolia RPC URL and signer key must be configured');
    this.rpc = rpc;
    this.account = privateKeyToAccount(key as Hex);
  }

  async submit(commitment: string) {
    if (!/^[a-f0-9]{64}$/.test(commitment)) throw new Error('Invalid audit commitment');
    const wallet = createWalletClient({ account: this.account, chain: sepolia, transport: http(this.rpc) });
    const hash = await wallet.sendTransaction({
      to: this.account.address,
      value: 0n,
      data: `0x${commitment}`,
    });
    return { receipt: `sepolia:${hash}` };
  }

  async confirm(receipt: string, commitment: string): Promise<'pending' | 'confirmed' | 'failed'> {
    if (!/^sepolia:0x[a-f0-9]{64}$/.test(receipt) || !/^[a-f0-9]{64}$/.test(commitment))
      return 'failed';
    const hash = receipt.slice('sepolia:'.length) as Hex;
    const publicClient = createPublicClient({ chain: sepolia, transport: http(this.rpc) });
    try {
      const mined = await publicClient.getTransactionReceipt({ hash });
      if (mined.status !== 'success') return 'failed';
      const transaction = await publicClient.getTransaction({ hash });
      if (transaction.from.toLowerCase() !== this.account.address.toLowerCase() ||
        transaction.to?.toLowerCase() !== this.account.address.toLowerCase() ||
        transaction.input.toLowerCase() !== `0x${commitment}`)
        return 'failed';
      return 'confirmed';
    } catch (error) {
      if (error instanceof TransactionReceiptNotFoundError) return 'pending';
      throw error;
    }
  }
}
