import { chainHash } from './hash';
export function verifyAuditSegment(
  events: { sequence: number; commitment: string; previousHash: string; hash: string }[],
  previousHash: string,
) {
  let sequence = -1;
  for (const event of events) {
    if (
      event.sequence <= sequence ||
      event.previousHash !== previousHash ||
      event.hash !== chainHash(event.previousHash, event.commitment)
    )
      return false;
    sequence = event.sequence;
    previousHash = event.hash;
  }
  return true;
}
