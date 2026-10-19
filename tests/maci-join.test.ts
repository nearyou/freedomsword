import { afterEach, expect, it, vi } from 'vitest';
import { PAD_KEY_HASH, hashLeanIMT, hashLeftRight } from '@maci-protocol/crypto';
import { LeanIMT } from '@zk-kit/lean-imt';
import { createMaciDeviceKey } from '../frontend/src/lib/maci-device';
import { createMaciJoinProof, maciJoiningInputs } from '../frontend/src/lib/maci-join';

const proofChecks = vi.hoisted(() => ({
  verify: vi.fn(async () => false),
  fullProve: vi.fn(async () => ({
    proof: { pi_a: ['1', '2'], pi_b: [['3', '4'], ['5', '6']], pi_c: ['7', '8'] },
    publicSignals: ['9'],
  })),
}));
vi.mock('snarkjs', () => ({ groth16: proofChecks }));
afterEach(() => { vi.unstubAllGlobals(); proofChecks.verify.mockClear(); });

it('builds a poll join witness from a matching public signup tree', () => {
  const key = createMaciDeviceKey();
  const tree = new LeanIMT<bigint>(hashLeanIMT);
  tree.insert(PAD_KEY_HASH);
  tree.insert(hashLeftRight(BigInt(key.publicKeyX), BigInt(key.publicKeyY)));
  const data = { stateTreeDepth: 10, stateRootIndex: 1, stateRoot: tree.root.toString(),
    stateIndex: 1, signups: [{ publicKeyX: key.publicKeyX.toString(),
      publicKeyY: key.publicKeyY.toString() }] };
  const inputs = maciJoiningInputs(key.privateKey, '0', data);
  expect(inputs.stateRootIndex).toBe(1);
  expect(inputs.circuitInputs.siblings).toHaveLength(10);
  expect(inputs.circuitInputs.actualStateTreeDepth).toBe('1');
  expect(() => maciJoiningInputs(key.privateKey, '0', { ...data, stateRoot: '42' }))
    .toThrow('does not match');
});

it('rejects a locally generated join proof that fails phone-side verification', async () => {
  const key = createMaciDeviceKey();
  const tree = new LeanIMT<bigint>(hashLeanIMT);
  tree.insert(PAD_KEY_HASH);
  tree.insert(hashLeftRight(BigInt(key.publicKeyX), BigInt(key.publicKeyY)));
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ vk_alpha_1: ['1'] })));
  await expect(createMaciJoinProof({
    privateKey: key.privateKey,
    pollId: '0',
    data: { stateTreeDepth: 10, stateRootIndex: 1, stateRoot: tree.root.toString(),
      stateIndex: 1, signups: [{ publicKeyX: key.publicKeyX.toString(),
        publicKeyY: key.publicKeyY.toString() }] },
    wasmUrl: '/zk/join.wasm', zkeyUrl: '/zk/join.zkey', vkeyUrl: '/zk/join-vkey.json',
  })).rejects.toThrow('invalid MACI join proof');
  expect(proofChecks.verify).toHaveBeenCalledOnce();
});
