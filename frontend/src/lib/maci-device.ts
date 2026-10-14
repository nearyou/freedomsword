import { Keypair, PrivateKey, PublicKey, VoteCommand } from '@maci-protocol/domainobjs';

const maxCommandField = 2n ** 50n - 1n;

function commandField(value: number | string, name: string) {
  const parsed = BigInt(value);
  if (parsed < 0n || parsed > maxCommandField) throw new Error(`Invalid ${name}`);
  return parsed;
}

export function createMaciDeviceKey() {
  const pair = new Keypair();
  const publicKey = pair.publicKey.asContractParam();
  return { privateKey: pair.privateKey.serialize(), publicKeyX: publicKey.x,
    publicKeyY: publicKey.y };
}

export function publicKeyForPrivateKey(serialized: string) {
  const pair = new Keypair(PrivateKey.deserialize(serialized));
  const publicKey = pair.publicKey.asContractParam();
  return { publicKeyX: publicKey.x, publicKeyY: publicKey.y };
}

/** A signed MACI command is encrypted on the device. Only ciphertext leaves this function. */
export function encryptMaciVote(input: {
  privateKey: string;
  coordinatorPublicKeyX: string;
  coordinatorPublicKeyY: string;
  pollStateIndex: number;
  voteOptionIndex: number;
  pollId: string;
  nonce: number;
}) {
  const voter = new Keypair(PrivateKey.deserialize(input.privateKey));
  const coordinator = new PublicKey([
    BigInt(input.coordinatorPublicKeyX), BigInt(input.coordinatorPublicKeyY),
  ]);
  const stateIndex = commandField(input.pollStateIndex, 'poll state index');
  const optionIndex = commandField(input.voteOptionIndex, 'vote option index');
  const pollId = commandField(input.pollId, 'poll ID');
  const nonce = commandField(input.nonce, 'nonce');
  if (stateIndex === 0n || nonce === 0n) throw new Error('Poll join and nonce are required');
  const command = new VoteCommand(stateIndex, voter.publicKey, optionIndex, 100n, nonce, pollId);
  const ephemeral = new Keypair();
  const shared = Keypair.generateEcdhSharedKey(ephemeral.privateKey, coordinator);
  const message = command.encrypt(command.sign(voter.privateKey), shared);
  const encryptionPublicKey = ephemeral.publicKey.asContractParam();
  return { data: message.asContractParam().data, encryptionPublicKeyX: encryptionPublicKey.x,
    encryptionPublicKeyY: encryptionPublicKey.y };
}
