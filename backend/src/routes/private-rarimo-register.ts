import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireUser } from '@backend/auth';
import { db } from '@backend/db';
import { subjectCommitment } from '@backend/eligibility';
import { ApiError } from '@backend/errors';
import { body, handle, json } from '@backend/http';
import { compactRarimoProof, registerRarimoPublicKey } from '@backend/rarimo-private-chain';
import { enforceRateLimitAsync } from '@backend/rate-limit';

const decimal = z.string().regex(/^(0|[1-9][0-9]{0,77})$/);
const schema = z.object({
  electionId: z.string().min(1).max(100), publicKeyX: decimal, publicKeyY: decimal,
  proof: z.object({
    pubSignals: z.array(decimal).length(23),
    proof: z.object({ piA: z.array(decimal).min(2).max(3),
      piB: z.array(z.array(decimal).min(2).max(2)).min(2).max(3),
      piC: z.array(decimal).min(2).max(3) }).strict(),
  }).strict(),
}).strict();

export async function POST(request: Request) {
  return handle(async () => {
    const input = await body(request, schema);
    const user = await requireUser(request);
    await enforceRateLimitAsync('private-rarimo', user.id, 5);
    const election = await db.election.findUnique({
      where: { id: input.electionId }, include: { privatePoll: true },
    });
    if (!election || election.protocol !== 'MACI_PRIVATE' ||
      !['UPCOMING', 'ACTIVE'].includes(election.status) || new Date() >= election.closesAt ||
      election.privatePoll?.registrationMode !== 'RARIMO' || election.privatePoll.chainId !== 7368)
      throw new ApiError(409, 'Rarimo registration is not open', 'RARIMO_REGISTRATION_CLOSED');
    const existing = await db.privateRegistration.findUnique({
      where: { userId_electionId: { userId: user.id, electionId: election.id } },
    });
    if (existing && (existing.publicKeyX !== input.publicKeyX || existing.publicKeyY !== input.publicKeyY))
      throw new ApiError(409, 'This election is already linked to another MACI key', 'PRIVATE_KEY_CHANGED');
    const nullifier = compactRarimoProof(input.proof).signals[0];
    const eligibilityCommitment = subjectCommitment('RARIMO',
      JSON.stringify([election.id, nullifier.toString()]));
    if (existing?.eligibilityCommitment !== undefined &&
      existing.eligibilityCommitment !== eligibilityCommitment)
      throw new ApiError(409, 'A different Rarimo identity registered this MACI key', 'RARIMO_IDENTITY_CHANGED');
    if (existing?.signupTxHash && existing.stateIndex !== null)
      return json({ registered: true, signupTxHash: existing.signupTxHash,
        stateIndex: existing.stateIndex, mode: 'RARIMO' });
    const recorded = await registerRarimoPublicKey({ gateAddress: election.privatePoll.gateAddress,
      maciAddress: election.privatePoll.maciAddress,
      deploymentBlock: election.privatePoll.deploymentBlock,
      accountCommitment: `0x${subjectCommitment('RARIMO_ACCOUNT',
        JSON.stringify([election.id, user.id]))}`,
      publicKeyX: BigInt(input.publicKeyX), publicKeyY: BigInt(input.publicKeyY),
      proof: input.proof });
    try {
      await db.privateRegistration.create({ data: { userId: user.id, electionId: election.id,
        eligibilityCommitment, publicKeyX: input.publicKeyX, publicKeyY: input.publicKeyY,
        signupTxHash: recorded.signupTxHash, stateIndex: recorded.stateIndex } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      const winner = await db.privateRegistration.findUnique({
        where: { userId_electionId: { userId: user.id, electionId: election.id } },
      });
      if (!winner || winner.publicKeyX !== input.publicKeyX || winner.publicKeyY !== input.publicKeyY ||
        winner.eligibilityCommitment !== eligibilityCommitment)
        throw new ApiError(409, 'This Rarimo identity is already registered', 'RARIMO_REPLAY');
    }
    return json({ registered: true, signupTxHash: recorded.signupTxHash,
      stateIndex: recorded.stateIndex, mode: 'RARIMO' });
  }, request, 'private-rarimo');
}
