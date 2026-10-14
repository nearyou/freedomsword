import { describe, expect, it } from 'vitest';
import { Keypair, Message, PrivateKey, PublicKey, VoteCommand } from '@maci-protocol/domainobjs';
import { createMaciDeviceKey, encryptMaciVote, publicKeyForPrivateKey } from '../frontend/src/lib/maci-device';

describe('device-side MACI commands', () => {
  it('restores a key and creates a ciphertext only the coordinator can decrypt', () => {
    const device = createMaciDeviceKey();
    expect(publicKeyForPrivateKey(device.privateKey)).toEqual({
      publicKeyX: device.publicKeyX, publicKeyY: device.publicKeyY,
    });
    const coordinator = new Keypair();
    const coordinatorPublic = coordinator.publicKey.asContractParam();
    const encrypted = encryptMaciVote({
      privateKey: device.privateKey,
      coordinatorPublicKeyX: coordinatorPublic.x.toString(),
      coordinatorPublicKeyY: coordinatorPublic.y.toString(),
      pollStateIndex: 1,
      voteOptionIndex: 2,
      pollId: '0',
      nonce: 1,
    });
    expect(encrypted.data).toHaveLength(10);
    expect(JSON.stringify(encrypted)).not.toContain(device.privateKey);
    const ephemeral = new PublicKey([BigInt(encrypted.encryptionPublicKeyX), BigInt(encrypted.encryptionPublicKeyY)]);
    const shared = Keypair.generateEcdhSharedKey(coordinator.privateKey, ephemeral);
    const decrypted = VoteCommand.decrypt(new Message(encrypted.data.map(BigInt)), shared);
    expect(decrypted.command.voteOptionIndex).toBe(2n);
    expect(decrypted.command.newVoteWeight).toBe(100n);
    expect(decrypted.command.nonce).toBe(1n);
    expect(decrypted.command.verifySignature(decrypted.signature,
      new Keypair(PrivateKey.deserialize(device.privateKey)).publicKey)).toBe(true);
  });

  it('rejects commands without a joined poll state or valid nonce', () => {
    const device = createMaciDeviceKey();
    const coordinator = new Keypair().publicKey.asContractParam();
    expect(() => encryptMaciVote({ privateKey: device.privateKey,
      coordinatorPublicKeyX: coordinator.x.toString(), coordinatorPublicKeyY: coordinator.y.toString(),
      pollStateIndex: 0, voteOptionIndex: 0, pollId: '0', nonce: 1 })).toThrow();
  });
});
