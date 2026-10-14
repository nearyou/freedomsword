// The MACI v3 crypto package expects Node's randomBytes API. In the browser,
// provide only that API using the operating system's Web Crypto generator.
export function randomBytes(length: number) {
  if (!Number.isSafeInteger(length) || length < 1 || length > 65_536)
    throw new Error('Invalid random byte count');
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Object.assign(bytes, {
    toString(encoding?: string) {
      if (encoding !== 'hex') throw new Error('Only hex encoding is supported');
      return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    },
  });
}
