import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireUser } from '@backend/auth';
import { db } from '@backend/db';
import { subjectCommitment } from '@backend/eligibility';
import { ApiError } from '@backend/errors';
import { body, handle, json } from '@backend/http';
import { registerLocalTestPublicKey } from '@backend/private-poll-chain';
import { enforceRateLimitAsync } from '@backend/rate-limit';
import { requireEligibility } from '@backend/verification';

const decimal = z.string().regex(/^(0|[1-9][0-9]{0,77})$/);
const inputSchema = z.object({
  electionId: z.string().min(1).max(100),
  publicKeyX: decimal,
  publicKeyY: decimal,
}).strict();

export async function POST(request: Request) {
  return handle(async () => {
    const input = await body(request, inputSchema);
    const user = await requireUser(request);
    await enforceRateLimitAsync('private-register', user.id, 5);
    const election = await db.election.findUnique({
      where: { id: input.electionId }, include: { privatePoll: true },
    });
    const now = new Date();
    if (!election || election.protocol !== 'MACI_PRIVATE' ||
      !['UPCOMING', 'ACTIVE'].includes(election.status) ||
      now >= election.closesAt || !election.privatePoll)
      throw new ApiError(409, 'Private registration is not open', 'PRIVATE_REGISTRATION_CLOSED');
    const poll = election.privatePoll;
    if (poll.registrationMode !== 'LOCAL_TEST')
      throw new ApiError(409, 'Rarimo registration must use the proof flow', 'PRIVATE_RARIMO_REQUIRED');
    await db.$transaction(async (tx) => requireEligibility(tx, user.id));
    const existing = await db.privateRegistration.findUnique({
      where: { userId_electionId: { userId: user.id, electionId: election.id } },
    });
    if (existing && (existing.publicKeyX !== input.publicKeyX || existing.publicKeyY !== input.publicKeyY))
      throw new ApiError(409, 'This election is already linked to a different MACI key', 'PRIVATE_KEY_CHANGED');
    if (existing?.signupTxHash && existing.stateIndex !== null)
      return json({ registered: true, signupTxHash: existing.signupTxHash, stateIndex: existing.stateIndex, mode: 'LOCAL_TEST' });
    const eligibilityCommitment = subjectCommitment('LOCAL_MACI_TEST',
      JSON.stringify([election.id, user.voterKey]));
    const recorded = await registerLocalTestPublicKey({
      gateAddress: poll.gateAddress, maciAddress: poll.maciAddress,
      deploymentBlock: poll.deploymentBlock,
      testNullifier: `0x${eligibilityCommitment}`,
      publicKeyX: BigInt(input.publicKeyX), publicKeyY: BigInt(input.publicKeyY),
    });
    try {
      await db.privateRegistration.create({ data: {
        userId: user.id, electionId: election.id,
        eligibilityCommitment, publicKeyX: input.publicKeyX, publicKeyY: input.publicKeyY,
        signupTxHash: recorded.signupTxHash, stateIndex: recorded.stateIndex,
      } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      const winner = await db.privateRegistration.findUnique({
        where: { userId_electionId: { userId: user.id, electionId: election.id } },
      });
      if (!winner || winner.publicKeyX !== input.publicKeyX || winner.publicKeyY !== input.publicKeyY)
        throw new ApiError(409, 'This election is already linked to another MACI key', 'PRIVATE_KEY_CHANGED');
    }
    return json({ registered: true, signupTxHash: recorded.signupTxHash,
      stateIndex: recorded.stateIndex, mode: 'LOCAL_TEST' });
  }, request, 'private-register');
}
