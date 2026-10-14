import { expect, it } from 'vitest';
import { PAD_KEY_HASH, hashLeanIMT, hashLeftRight } from '@maci-protocol/crypto';
import { LeanIMT } from '@zk-kit/lean-imt';
import { createMaciDeviceKey } from '../frontend/src/lib/maci-device';
import { maciJoiningInputs } from '../frontend/src/lib/maci-join';

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
