import 'dotenv/config';
import { verifyDatabaseEvidence } from '../src/server/integrity-check';
import { db } from '../src/server/db';

async function main() {
  const summary = await verifyDatabaseEvidence();
  process.stdout.write(JSON.stringify({ status: 'ok', ...summary }) + '\n');
}
main().catch(() => {
  process.stderr.write('Evidence integrity check failed. Inspect the database with an authorized operator.\n');
  process.exitCode = 1;
}).finally(() => db.$disconnect());
