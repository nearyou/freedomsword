import { readFileSync } from 'node:fs';
import { verifyAuditExport } from '../src/lib/audit-export';

const path = process.argv[2];
if (!path) throw new Error('Usage: npm run audit:verify -- <audit-export.json>');
const value = JSON.parse(readFileSync(path, 'utf8')) as unknown;
if (!verifyAuditExport(value)) {
  process.stderr.write('Audit export hash or chain is invalid.\n');
  process.exitCode = 1;
} else {
  process.stdout.write('Audit export hash and public chain verified.\n');
}
