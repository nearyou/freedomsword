export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { serverConfig } = await import('./config');
    serverConfig();
  }
}
