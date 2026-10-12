import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const root = fileURLToPath(new URL('../', import.meta.url));

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

it('keeps frontend and backend source and dependencies separate', () => {
  expect(existsSync(join(root, 'src', 'shared'))).toBe(false);
  const frontend = sourceFiles(join(root, 'frontend', 'src'))
    .map((file) => readFileSync(file, 'utf8')).join('\n');
  const backend = sourceFiles(join(root, 'backend', 'src'))
    .map((file) => readFileSync(file, 'utf8')).join('\n');
  expect(frontend).not.toMatch(/@backend\/|backend\/src\/|@\/shared\/|src\/shared\//);
  expect(backend).not.toMatch(/@frontend\/|frontend\/src\/|@\/shared\/|src\/shared\//);
  const frontendPackage = JSON.parse(readFileSync(join(root, 'frontend', 'package.json'), 'utf8'));
  const backendPackage = JSON.parse(readFileSync(join(root, 'backend', 'package.json'), 'utf8'));
  expect(frontendPackage.dependencies).not.toHaveProperty('@prisma/client');
  expect(frontendPackage.dependencies).not.toHaveProperty('viem');
  expect(backendPackage.dependencies).not.toHaveProperty('recharts');
  expect(backendPackage.dependencies).not.toHaveProperty('lucide-react');
  expect(backendPackage.dependencies).toHaveProperty('express');
  expect(backendPackage.dependencies).not.toHaveProperty('next');
  expect(backend).not.toMatch(/next\/server|NextRequest|NextResponse/);
});
