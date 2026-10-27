import { z } from 'zod';
import { sha256 } from '@backend/core/hash';
import { secret } from '../secrets';

const hex32 = z.string().regex(/^0x[a-f0-9]{64}$/);
const policy = z.object({
  recallEnabled: z.boolean(), fullEnabled: z.boolean(), partialEnabled: z.boolean(),
  partialAmount: z.number().int().min(1).max(100),
  firstDelay: z.number().int().min(0).max(31_536_000),
  cooldown: z.number().int().min(0).max(31_536_000),
  maxOperations: z.number().int().min(0).max(100),
}).strict();
const config = z.object({
  opensAt: z.number().int().positive(), closesAt: z.number().int().positive(), policy,
}).strict();
const cast = z.object({ kind: z.literal('CAST'), electionKey: hex32, nullifier: hex32,
  candidateCommitment: hex32, config }).strict();
const recall = z.object({ kind: z.literal('RECALL'), electionKey: hex32, nullifier: hex32,
  full: z.boolean(), config }).strict();
const close = z.object({ kind: z.literal('CLOSE'), electionKey: hex32 }).strict();
export const chainActionSchema = z.discriminatedUnion('kind', [cast, recall, close]);
export type ChainAction = z.infer<typeof chainActionSchema>;

export function chainElectionKey(electionId: string) {
  return `0x${sha256(`freedomsword:election:v1:${electionId}`)}`;
}

export function chainNullifier(electionId: string, pseudonym: string) {
  return `0x${sha256(`freedomsword:nullifier:v1:${electionId}:${pseudonym}:${secret('BALLOT_SECRET')}`)}`;
}

export function chainCandidateCommitment(candidateId: string, voteId: string) {
  return `0x${sha256(`freedomsword:choice:v1:${candidateId}:${voteId}:${secret('BALLOT_SECRET')}`)}`;
}

export function electionChainConfig(election: {
  opensAt: Date; closesAt: Date; recallEnabled: boolean; fullRecallEnabled: boolean;
  partialRecallEnabled: boolean; partialRecallAmount: number; firstRecallDelaySeconds: number;
  recallCooldownSeconds: number; maxRecallOperations: number | null;
}) {
  return {
    opensAt: Math.floor(election.opensAt.getTime() / 1000),
    closesAt: Math.floor(election.closesAt.getTime() / 1000),
    policy: {
      recallEnabled: election.recallEnabled,
      fullEnabled: election.fullRecallEnabled,
      partialEnabled: election.partialRecallEnabled,
      partialAmount: election.partialRecallAmount,
      firstDelay: election.firstRecallDelaySeconds,
      cooldown: election.recallCooldownSeconds,
      maxOperations: election.maxRecallOperations ?? 0,
    },
  };
}
