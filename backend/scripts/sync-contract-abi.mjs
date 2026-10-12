import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const artifactPath = resolve('artifacts/contracts/FreedomSwordVoting.sol/FreedomSwordVoting.json');
const outputPath = resolve('src/chain/abi.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(artifact.abi, null, 2)}\n`);
