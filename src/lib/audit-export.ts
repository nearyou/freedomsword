import { z } from 'zod';
import { sha256 } from './hash';
import { verifyAuditSegment } from './audit-chain';

/** Stable JSON encoding for cross-process SHA-256 verification. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  throw new Error('Audit export contains a non-JSON value');
}

const chainEvent = z.object({
  sequence: z.number().int().positive(),
  commitment: z.string().regex(/^[a-f0-9]{64}$/),
  previousHash: z.string().regex(/^[a-f0-9]{64}$/),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
}).passthrough();
const envelope = z.object({
  algorithm: z.literal('SHA-256'),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bundle: z.object({
    // Previously downloaded bundles retain their original schema identifier and hash.
    schemaVersion: z.enum(['freedomsword-audit-bundle/v1', 'dynamic-democracy-audit-bundle/v1']),
    publicAuditChain: z.array(chainEvent),
    aggregates: z.object({
      voteUnitsCast: z.number().int().nonnegative(),
      recalledUnits: z.number().int().nonnegative(),
      activeUnits: z.number().int().nonnegative(),
    }).passthrough(),
    candidates: z.array(z.object({ activeUnits: z.number().int().nonnegative() }).passthrough()),
  }).passthrough(),
}).strict();

export function hashAuditBundle(bundle: unknown) { return sha256(canonicalJson(bundle)); }
export function verifyAuditExport(value: unknown) {
  const parsed = envelope.safeParse(value);
  if (!parsed.success) return false;
  const { bundle, sha256: expected } = parsed.data;
  if (hashAuditBundle(bundle) !== expected) return false;
  if (!verifyAuditSegment(bundle.publicAuditChain, '0'.repeat(64))) return false;
  if (bundle.aggregates.voteUnitsCast - bundle.aggregates.recalledUnits !== bundle.aggregates.activeUnits)
    return false;
  if (bundle.candidates.reduce((sum, candidate) => sum + candidate.activeUnits, 0) !== bundle.aggregates.activeUnits)
    return false;
  return true;
}
