import { z } from 'zod';
import { requireUser } from '@backend/auth';
import { db } from '@backend/db';
import { ApiError } from '@backend/errors';
import { body, handle, json } from '@backend/http';
import { joinLocalPrivatePoll } from '@backend/private-poll-chain';
import { enforceRateLimitAsync } from '@backend/rate-limit';
import { requireCurrentAgreement, requireEligibility } from '@backend/verification';

const decimal = z.string().regex(/^(0|[1-9][0-9]{0,77})$/);
const schema = z.object({
  electionId: z.string().min(1).max(100),
  nullifier: decimal,
  stateRootIndex: z.number().int().min(1),
  proof: z.tuple([decimal, decimal, decimal, decimal,
    decimal, decimal, decimal, decimal]),
}).strict();

export async function POST(request: Request) {
  return handle(async () => {
    const input = await body(request, schema);
    const user = await requireUser(request);
    await enforceRateLimitAsync('private-join', user.id, 5);
    const election = await db.election.findUnique({
      where: { id: input.electionId }, include: { privatePoll: true },
    });
    if (!election || election.protocol !== 'MACI_PRIVATE' ||
      !['UPCOMING', 'ACTIVE'].includes(election.status) ||
      new Date() >= election.closesAt || !election.privatePoll ||
      !['LOCAL_TEST', 'RARIMO'].includes(election.privatePoll.registrationMode))
      throw new ApiError(409, 'Private poll join is not open', 'PRIVATE_JOIN_CLOSED');
    await db.$transaction(async (tx) => election.privatePoll!.registrationMode === 'RARIMO'
      ? requireCurrentAgreement(tx, user.id) : requireEligibility(tx, user.id));
    const registration = await db.privateRegistration.findUnique({
      where: { userId_electionId: { userId: user.id, electionId: election.id } },
    });
    if (!registration?.signupTxHash || registration.stateIndex === null ||
      input.stateRootIndex < registration.stateIndex)
      throw new ApiError(409, 'Register this MACI key before joining the poll', 'PRIVATE_NOT_REGISTERED');
    const result = await joinLocalPrivatePoll({
      chainId: election.privatePoll.chainId,
      pollAddress: election.privatePoll.pollAddress,
      deploymentBlock: election.privatePoll.deploymentBlock,
      publicKeyX: BigInt(registration.publicKeyX),
      publicKeyY: BigInt(registration.publicKeyY),
      nullifier: BigInt(input.nullifier), stateRootIndex: BigInt(input.stateRootIndex),
      proof: input.proof.map(BigInt) as [bigint, bigint, bigint, bigint,
        bigint, bigint, bigint, bigint],
    });
    return json({ joined: true, ...result });
  }, request, 'private-join');
}
