import { z } from 'zod';
import { requireUser } from '@backend/auth';
import { db } from '@backend/db';
import { subjectCommitment } from '@backend/eligibility';
import { ApiError } from '@backend/errors';
import { body, handle, json } from '@backend/http';
import { rarimoProofRequest } from '@backend/rarimo-private-chain';
import { enforceRateLimitAsync } from '@backend/rate-limit';

const decimal = z.string().regex(/^(0|[1-9][0-9]{0,77})$/);
const schema = z.object({ electionId: z.string().min(1).max(100),
  publicKeyX: decimal, publicKeyY: decimal }).strict();

export async function POST(request: Request) {
  return handle(async () => {
    const input = await body(request, schema);
    const user = await requireUser(request);
    await enforceRateLimitAsync('private-rarimo', user.id, 10);
    const election = await db.election.findUnique({
      where: { id: input.electionId }, include: { privatePoll: true },
    });
    if (!election || election.protocol !== 'MACI_PRIVATE' ||
      !['UPCOMING', 'ACTIVE'].includes(election.status) ||
      new Date() >= election.closesAt ||
      election.privatePoll?.registrationMode !== 'RARIMO' || election.privatePoll.chainId !== 7368)
      throw new ApiError(409, 'Rarimo registration is not open', 'RARIMO_REGISTRATION_CLOSED');
    const existing = await db.privateRegistration.findUnique({
      where: { userId_electionId: { userId: user.id, electionId: election.id } },
    });
    if (existing && (existing.publicKeyX !== input.publicKeyX || existing.publicKeyY !== input.publicKeyY))
      throw new ApiError(409, 'This election is already linked to another MACI key', 'PRIVATE_KEY_CHANGED');
    return json(await rarimoProofRequest({ gateAddress: election.privatePoll.gateAddress,
      publicKeyX: BigInt(input.publicKeyX), publicKeyY: BigInt(input.publicKeyY),
      accountCommitment: `0x${subjectCommitment('RARIMO_ACCOUNT',
        JSON.stringify([election.id, user.id]))}` }));
  }, request, 'private-rarimo');
}
