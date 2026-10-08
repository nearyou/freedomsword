import { z } from 'zod';

const seconds = (fallback: number) =>
  z.coerce.number().int().positive().max(86_400).default(fallback);

const environment = z.enum(['development', 'test', 'staging', 'production']);
const provider = z.enum(['mock']);

export function loadConfig(env: Record<string, string | undefined> = process.env) {
  const mode = environment.parse(env.APP_ENV ?? env.NODE_ENV ?? 'development');
  if (env.NODE_ENV === 'production' && (mode === 'development' || mode === 'test'))
    throw new Error('Invalid server configuration: APP_ENV');
  const strict = mode === 'staging' || mode === 'production';
  const databaseUrl = env.DATABASE_URL;
  const appUrl = env.NEXT_PUBLIC_APP_URL ?? env.APP_ORIGIN;
  const sessionSecret = env.SESSION_SECRET;
  const ballotSecret = env.BALLOT_SECRET;
  const eligibilityCommitmentSecret = env.ELIGIBILITY_COMMITMENT_SECRET;
  const authSetting = z.enum(['true', 'false']).optional().parse(env.TELEGRAM_AUTH_ENABLED);
  const authEnabled =
    authSetting === 'true' || (authSetting !== 'false' && (strict || !!env.TELEGRAM_BOT_TOKEN));
  const authMaxAgeSeconds = seconds(300).parse(env.TELEGRAM_AUTH_MAX_AGE_SECONDS);
  const sessionMaxAgeSeconds = seconds(21_600).parse(env.SESSION_MAX_AGE_SECONDS);
  const eligibilityProvider = provider.parse(
    env.ELIGIBILITY_PROVIDER ?? (strict ? undefined : 'mock'),
  );
  const logLevel = z.enum(['error', 'warn', 'info', 'debug']).parse(env.LOG_LEVEL ?? 'info');
  const rateLimitBackend = z.enum(['memory', 'postgres']).parse(env.RATE_LIMIT_BACKEND ?? 'memory');

  let database: URL;
  let app: URL;
  try {
    database = new URL(databaseUrl ?? '');
    app = new URL(appUrl ?? '');
  } catch {
    throw new Error('Invalid server configuration: URL');
  }
  if (
    !['postgres:', 'postgresql:'].includes(database.protocol) ||
    !database.hostname ||
    !database.pathname.slice(1)
  )
    throw new Error('Invalid server configuration: DATABASE_URL');
  if (
    !['http:', 'https:'].includes(app.protocol) ||
    !app.hostname ||
    appUrl !== app.origin ||
    app.username ||
    app.password ||
    app.pathname !== '/' ||
    app.search ||
    app.hash
  )
    throw new Error('Invalid server configuration: APP_ORIGIN');
  if (strict && app.protocol !== 'https:')
    throw new Error('Invalid server configuration: HTTPS app URL required');
  if (env.APP_ORIGIN && env.NEXT_PUBLIC_APP_URL && env.APP_ORIGIN !== env.NEXT_PUBLIC_APP_URL)
    throw new Error('Invalid server configuration: app URLs differ');
  if (
    !sessionSecret ||
    sessionSecret.length < 32 ||
    /^(replace-|GENERATE_|YOUR_)/i.test(sessionSecret) ||
    /^(.)(\1)+$/.test(sessionSecret)
  )
    throw new Error('Invalid server configuration: SESSION_SECRET');
  if (
    !ballotSecret ||
    ballotSecret.length < 32 ||
    /^(replace-|GENERATE_|YOUR_)/i.test(ballotSecret) ||
    ballotSecret === sessionSecret ||
    /^(.)(\1)+$/.test(ballotSecret)
  )
    throw new Error('Invalid server configuration: BALLOT_SECRET');
  if (
    strict &&
    (!eligibilityCommitmentSecret ||
      eligibilityCommitmentSecret.length < 32 ||
      eligibilityCommitmentSecret === sessionSecret ||
      eligibilityCommitmentSecret === ballotSecret ||
      /^(replace-|GENERATE_|YOUR_)/i.test(eligibilityCommitmentSecret))
  )
    throw new Error('Invalid server configuration: ELIGIBILITY_COMMITMENT_SECRET');
  if (strict && !env.TELEGRAM_AUTH_MAX_AGE_SECONDS)
    throw new Error('Invalid server configuration: TELEGRAM_AUTH_MAX_AGE_SECONDS');
  if (strict && !env.SESSION_MAX_AGE_SECONDS)
    throw new Error('Invalid server configuration: SESSION_MAX_AGE_SECONDS');
  if (authEnabled && !/^[0-9]{5,}:[A-Za-z0-9_-]{20,}$/.test(env.TELEGRAM_BOT_TOKEN ?? ''))
    throw new Error('Invalid server configuration: TELEGRAM_BOT_TOKEN');
  if (mode === 'production' && !authEnabled)
    throw new Error('Invalid server configuration: Telegram authentication required');
  if (strict && env.ALLOW_DEMO_AUTH === 'true')
    throw new Error('Invalid server configuration: demo authentication');
  return {
    mode,
    databaseUrl: database.toString(),
    appOrigin: app.origin,
    sessionSecret,
    ballotSecret,
    eligibilityCommitmentSecret: eligibilityCommitmentSecret ?? sessionSecret,
    telegramBotToken: authEnabled ? env.TELEGRAM_BOT_TOKEN! : null,
    authEnabled,
    authMaxAgeSeconds,
    sessionMaxAgeSeconds,
    eligibilityProvider,
    logLevel,
    rateLimitBackend,
  };
}

export function serverConfig() {
  return loadConfig();
}

export function authMaxAgeSeconds(env: Record<string, string | undefined> = process.env) {
  return seconds(300).parse(env.TELEGRAM_AUTH_MAX_AGE_SECONDS);
}

export function sessionMaxAgeSeconds(env: Record<string, string | undefined> = process.env) {
  return seconds(21_600).parse(env.SESSION_MAX_AGE_SECONDS);
}

export function eligibilityProviderName(env: Record<string, string | undefined> = process.env) {
  return provider.parse(env.ELIGIBILITY_PROVIDER ?? 'mock');
}

export function demoAuthEnabled(env: Record<string, string | undefined> = process.env) {
  return env.NODE_ENV !== 'production' &&
    (env.APP_ENV ?? env.NODE_ENV ?? 'development') === 'development' &&
    env.ALLOW_DEMO_AUTH === 'true';
}
