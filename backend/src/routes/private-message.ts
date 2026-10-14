import { z } from 'zod';
import { requireUser } from '@backend/auth';
import { db } from '@backend/db';
import { ApiError } from '@backend/errors';
import { body, handle, json } from '@backend/http';
import { findLocalPollJoin, publishLocalPrivateMessage } from '@backend/private-poll-chain';
import { enforceRateLimitAsync } from '@backend/rate-limit';
import { requireEligibility } from '@backend/verification';

const decimal = z.string().regex(/^(0|[1-9][0-9]{0,77})$/);
const schema = z.object({
  electionId: z.string().min(1).max(100),
  data: z.tuple([decimal, decimal, decimal, decimal, decimal,
    decimal, decimal, decimal, decimal, decimal]),
  encryptionPublicKeyX: decimal,
  encryptionPublicKeyY: decimal,
}).strict();

export async function POST(request: Request) {
  return handle(async () => {
    const input = await body(request, schema);
    const user = await requireUser(request);
    await enforceRateLimitAsync('private-message', user.id, 20);
    const election = await db.election.findUnique({
      where: { id: input.electionId }, include: { privatePoll: true },
    });
    const now = new Date();
    if (!election || election.protocol !== 'MACI_PRIVATE' || election.status !== 'ACTIVE' ||
      now < election.opensAt || now >= election.closesAt || !election.privatePoll ||
      election.privatePoll.registrationMode !== 'LOCAL_TEST')
      throw new ApiError(409, 'Encrypted private voting is not open', 'PRIVATE_MESSAGE_CLOSED');
    await db.$transaction(async (tx) => requireEligibility(tx, user.id));
    const registration = await db.privateRegistration.findUnique({
      where: { userId_electionId: { userId: user.id, electionId: election.id } },
    });
    if (!registration?.signupTxHash)
      throw new ApiError(409, 'Register before voting privately', 'PRIVATE_NOT_REGISTERED');
    const joined = await findLocalPollJoin({
      pollAddress: election.privatePoll.pollAddress,
      deploymentBlock: election.privatePoll.deploymentBlock,
      publicKeyX: BigInt(registration.publicKeyX), publicKeyY: BigInt(registration.publicKeyY),
    });
    if (!joined)
      throw new ApiError(409, 'Join the MACI poll before sending a ballot', 'PRIVATE_NOT_JOINED');
    const sent = await publishLocalPrivateMessage({
      pollAddress: election.privatePoll.pollAddress,
      data: input.data.map(BigInt) as [bigint, bigint, bigint, bigint, bigint,
        bigint, bigint, bigint, bigint, bigint],
      encryptionPublicKeyX: BigInt(input.encryptionPublicKeyX),
      encryptionPublicKeyY: BigInt(input.encryptionPublicKeyY),
    });
    return json({ submitted: true, counted: false, ...sent });
  }, request, 'private-message');
}
