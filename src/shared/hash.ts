import { createHash, createHmac, randomBytes } from 'node:crypto';
export const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
export const saltedCommitment = (value: string) =>
  sha256(`${randomBytes(32).toString('hex')}:${value}`);
export const chainHash = (previousHash: string, commitment: string) =>
  sha256(`${previousHash}:${commitment}`);
export function ballotPseudonym(voterKey: string, electionId: string, secret: string) {
  return createHmac('sha256', secret)
    .update(JSON.stringify(['ballot-v1', electionId, voterKey]))
    .digest('hex');
}
