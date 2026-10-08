import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const phase = Number(process.argv[2]);
if (!Number.isInteger(phase) || phase < 1 || phase > 14)
  throw new Error('Use npm run phase -- <1..14>');
const result = spawnSync('npm run check', { shell: true, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
const path = new URL('../TASKS.md', import.meta.url);
const text = readFileSync(path, 'utf8').replace(
  new RegExp(`(\\| ${phase} [^\\n]+\\| )Pending( \\|)`),
  '$1Complete$2',
);
writeFileSync(
  path,
  text + `\nPhase ${phase}: TypeScript, ESLint and Vitest passed (${new Date().toISOString()}).\n`,
);
