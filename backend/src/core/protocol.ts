import { ApiError } from '../errors';

export function requireLegacyBallotProtocol(protocol: string | null | undefined) {
  if (protocol === 'LEGACY_RECALL' || protocol == null) return;
  if (protocol === 'CONTINUOUS_SUPPORT')
    throw new ApiError(409, 'Use the reusable-support API for this election', 'SUPPORT_ELECTION_LEGACY_API');
  throw new ApiError(
    409,
    'This election uses private voting; the legacy ballot API is unavailable',
    'PRIVATE_ELECTION_LEGACY_API',
  );
}
