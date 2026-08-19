import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

/**
 * Deployment diagnostic: GET /api/health
 *
 * Deliberately does NOT use `handler()` — that opens the database connection
 * first, so a database problem would turn this route into the same opaque 500
 * it is meant to explain. It reports booleans and a masked host only; no
 * connection string, password or secret is ever returned.
 *
 * `force-dynamic` keeps it from being answered from a build-time cache, which
 * would report the build machine's environment instead of the server's.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** "…@cluster0.abcd.mongodb.net/foodbox" -> "cluster0.abcd.mongodb.net/foodbox" */
function maskedTarget(uri: string | undefined): string | null {
  if (!uri) return null;
  try {
    const withoutCredentials = uri.replace(/\/\/[^@]*@/, '//');
    const afterScheme = withoutCredentials.split('://')[1] ?? '';
    const [hosts, rest] = afterScheme.split('/');
    const firstHost = hosts.split(',')[0];
    const database = (rest ?? '').split('?')[0];
    return database ? `${firstHost}/${database}` : firstHost;
  } catch {
    return 'unparseable';
  }
}

export async function GET() {
  const started = Date.now();

  const env = {
    MONGODB_URI: Boolean(process.env.MONGODB_URI?.trim()),
    JWT_SECRET: Boolean(process.env.JWT_SECRET?.trim()),
    JWT_EXPIRE: process.env.JWT_EXPIRE ?? '(unset, defaults to 30d)',
    SETUP_SECRET: Boolean(process.env.SETUP_SECRET?.trim()),
    // Inlined at build time, so this reflects the build environment.
    NEXT_PUBLIC_USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK ?? '(unset)',
  };

  /**
   * Names only — never values. Catches the two failures the booleans above
   * cannot explain: a misspelled variable (MONGO_URI, MONGODB_URL, a trailing
   * space) and a variable that exists but is empty.
   */
  const relatedNames = Object.keys(process.env)
    .filter((name) => /MONGO|JWT|SETUP_SECRET|ADMIN_(EMAIL|PASSWORD)|USE_MOCK/i.test(name))
    .sort()
    .map((name) => (process.env[name]?.trim() ? name : `${name} (EMPTY)`));

  /**
   * Which deployment answered. A variable set only for Production is invisible
   * to a Preview deployment, so a branch/preview URL keeps failing while the
   * production one works.
   */
  const platform = process.env.VERCEL
    ? {
        host: 'vercel',
        environment: process.env.VERCEL_ENV ?? 'unknown',
        note:
          process.env.VERCEL_ENV !== 'production'
            ? 'This is NOT the production deployment. Environment variables must be ' +
              'enabled for this environment too (Preview / Development).'
            : undefined,
      }
    : { host: 'self-hosted or local' };

  const uri = process.env.MONGODB_URI?.trim();

  const database: Record<string, unknown> = {
    target: maskedTarget(uri),
    connected: false,
  };

  if (!uri) {
    database.error = 'MONGODB_URI is not set on this deployment.';
    database.likelyCause =
      'A .env file is never uploaded. Set MONGODB_URI in the host environment ' +
      'variables, enable it for this environment, then REDEPLOY — saving alone ' +
      'does not rebuild. Compare envNamesVisible below against the exact spelling.';
  } else {
    try {
      // A short timeout so a blocked IP fails fast instead of hitting the
      // platform's function timeout and returning a generic gateway error.
      const conn = await mongoose.connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
      });
      await conn.connection.db?.admin().ping();
      database.connected = true;
      database.name = conn.connection.db?.databaseName ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      database.error = message.split('\n')[0];
      // The overwhelmingly common cause of this failing in production while
      // working locally is the Atlas IP Access List.
      if (/ServerSelection|ETIMEDOUT|querySrv|ENOTFOUND/i.test(message)) {
        database.likelyCause =
          'The database refused or timed out the connection. In MongoDB Atlas, ' +
          'add 0.0.0.0/0 to Network Access — serverless hosts use changing IPs.';
      } else if (/Authentication failed|bad auth/i.test(message)) {
        database.likelyCause = 'The database username or password in MONGODB_URI is wrong.';
      }
    }
  }

  const missing = Object.entries({ MONGODB_URI: env.MONGODB_URI, JWT_SECRET: env.JWT_SECRET })
    .filter(([, present]) => !present)
    .map(([name]) => name);

  const healthy = missing.length === 0 && database.connected === true;

  return NextResponse.json(
    {
      success: healthy,
      healthy,
      missingEnv: missing,
      env,
      envNamesVisible: relatedNames,
      platform,
      database,
      node: process.version,
      tookMs: Date.now() - started,
    },
    { status: healthy ? 200 : 503 }
  );
}
