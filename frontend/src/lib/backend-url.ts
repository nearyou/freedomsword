/** Server-only destination for the independent API deployment. */
export function backendOrigin() {
  const raw = process.env.BACKEND_URL ??
    (process.env.NODE_ENV === 'development' &&
      (!process.env.APP_ENV || process.env.APP_ENV === 'development')
      ? 'http://127.0.0.1:3001' : undefined);
  if (!raw) throw new Error('BACKEND_URL is required for the frontend');
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname ||
    url.origin !== raw || url.username || url.password || url.search || url.hash)
    throw new Error('BACKEND_URL must be an HTTP(S) origin');
  return url.origin;
}
