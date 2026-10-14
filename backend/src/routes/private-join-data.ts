import { requireUser } from '@backend/auth';
import { db } from '@backend/db';
import { ApiError } from '@backend/errors';
import { handle, json } from '@backend/http';
import { localPollJoiningData } from '@backend/private-poll-chain';
import { enforceRateLimitAsync } from '@backend/rate-limit';

export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireUser(request);
    await enforceRateLimitAsync('private-join', user.id, 20);
    const electionId = new URL(request.url).searchParams.get('electionId');
    if (!electionId || electionId.length > 100)
      throw new ApiError(400, 'Election ID is required');
    const election = await db.election.findUnique({
      where: { id: electionId }, include: { privatePoll: true },
    });
    const registration = await db.privateRegistration.findUnique({
      where: { userId_electionId: { userId: user.id, electionId } },
    });
    if (!election || election.protocol !== 'MACI_PRIVATE' ||
      !['UPCOMING', 'ACTIVE'].includes(election.status) || !election.privatePoll ||
      election.privatePoll.registrationMode !== 'LOCAL_TEST' ||
      !registration?.signupTxHash || registration.stateIndex === null)
      throw new ApiError(409, 'Register for the local MACI poll first', 'PRIVATE_NOT_REGISTERED');
    const data = await localPollJoiningData({
      maciAddress: election.privatePoll.maciAddress,
      deploymentBlock: election.privatePoll.deploymentBlock,
    });
    return json({ ...data, stateIndex: registration.stateIndex });
  }, request, 'private-join');
}
