/** The contract reverted this action when simulated; resending it unchanged cannot succeed on its own. */
export class ChainRejectedError extends Error {
  constructor(
    public readonly reason: string,
    /** True when the revert may clear with time, such as a recall delay the chain clock has not reached. */
    public readonly retryable: boolean,
  ) {
    super(`Contract rejected the action: ${reason}`);
  }
}

const permanent = new Set([
  'ElectionUnavailable', 'ElectionAlreadyRegistered', 'BallotAlreadyExists', 'BallotMissing', 'InvalidInput',
]);

/** Null means the revert is not a known contract rule (for example an authorization problem to investigate). */
export function classifyRevert(errorName: string): ChainRejectedError | null {
  if (permanent.has(errorName)) return new ChainRejectedError(errorName, false);
  if (errorName === 'RecallUnavailable') return new ChainRejectedError(errorName, true);
  return null;
}
