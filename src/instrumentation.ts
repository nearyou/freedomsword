export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { serverConfig } = await import('./backend/config');
    serverConfig();
  }
}
