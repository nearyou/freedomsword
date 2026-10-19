import { PAD_KEY_HASH, hashLeanIMT, hashLeftRight, poseidon } from '@maci-protocol/crypto';
import { Keypair, PrivateKey } from '@maci-protocol/domainobjs';
import { LeanIMT } from '@zk-kit/lean-imt';

export type MaciJoiningData = {
  stateTreeDepth: number;
  stateRootIndex: number;
  stateRoot: string;
  stateIndex: number;
  signups: { publicKeyX: string; publicKeyY: string }[];
};

/** All proof inputs, including the private key, stay in the browser. */
export function maciJoiningInputs(privateKey: string, pollId: string, data: MaciJoiningData) {
  const voter = new Keypair(PrivateKey.deserialize(privateKey));
  const tree = new LeanIMT<bigint>(hashLeanIMT);
  tree.insert(PAD_KEY_HASH);
  for (const signup of data.signups)
    tree.insert(hashLeftRight(BigInt(signup.publicKeyX), BigInt(signup.publicKeyY)));
  if (tree.root !== BigInt(data.stateRoot) || tree.size !== data.stateRootIndex + 1)
    throw new Error('MACI signup tree does not match the chain');
  if (data.stateIndex < 1 || data.stateIndex >= tree.size ||
    data.stateTreeDepth < tree.depth || data.stateTreeDepth > 10)
    throw new Error('Invalid MACI signup tree position');
  const own = voter.publicKey.asContractParam();
  const recorded = data.signups[data.stateIndex - 1];
  if (recorded.publicKeyX !== own.x.toString() || recorded.publicKeyY !== own.y.toString())
    throw new Error('This device key does not match the registered key');
  const inclusion = tree.generateProof(data.stateIndex);
  const siblings = Array.from({ length: data.stateTreeDepth }, (_, index) =>
    [String(inclusion.siblings[index] ?? 0n)]);
  const nullifier = poseidon([BigInt(voter.privateKey.asCircuitInputs()), BigInt(pollId)]);
  return { nullifier: nullifier.toString(), stateRootIndex: data.stateRootIndex,
    circuitInputs: {
      privateKey: voter.privateKey.asCircuitInputs(),
      pollPublicKey: voter.publicKey.asCircuitInputs(),
      siblings,
      index: data.stateIndex.toString(),
      nullifier: nullifier.toString(),
      stateRoot: data.stateRoot,
      actualStateTreeDepth: inclusion.siblings.length.toString(),
      pollId,
    } };
}

export async function createMaciJoinProof(input: {
  privateKey: string;
  pollId: string;
  data: MaciJoiningData;
  wasmUrl: string;
  zkeyUrl: string;
  vkeyUrl: string;
}) {
  for (const path of [input.wasmUrl, input.zkeyUrl, input.vkeyUrl])
    if (!path.startsWith('/') || path.startsWith('//'))
      throw new Error('MACI proof artifacts must use same-origin paths');
  const prepared = maciJoiningInputs(input.privateKey, input.pollId, input.data);
  const response = await fetch(input.vkeyUrl, { cache: 'force-cache' });
  if (!response.ok) throw new Error('MACI verification key is unavailable');
  const verificationKey: unknown = await response.json();
  const { groth16 } = await import('snarkjs');
  const { proof, publicSignals } = await groth16.fullProve(prepared.circuitInputs,
    input.wasmUrl, input.zkeyUrl);
  if (!await groth16.verify(verificationKey, publicSignals, proof))
    throw new Error('This device generated an invalid MACI join proof');
  return { nullifier: prepared.nullifier, stateRootIndex: prepared.stateRootIndex,
    proof: [proof.pi_a[0], proof.pi_a[1], proof.pi_b[0][1], proof.pi_b[0][0],
      proof.pi_b[1][1], proof.pi_b[1][0], proof.pi_c[0], proof.pi_c[1]] };
}
