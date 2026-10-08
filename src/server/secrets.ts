export function secret(name: 'SESSION_SECRET' | 'BALLOT_SECRET'): string {
  const value = process.env[name];
  if (!value || value.length < 32 || value.startsWith('replace-'))
    throw new Error(`${name} must be configured with at least 32 random characters`);
  return value;
}
