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
    MONGODB_URI: Boolean(process.env.MONGODB_URI),
    JWT_SECRET: Boolean(process.env.JWT_SECRET),
    JWT_EXPIRE: process.env.JWT_EXPIRE ?? '(unset, defaults to 30d)',
    SETUP_SECRET: Boolean(process.env.SETUP_SECRET),
    // Inlined at build time, so this reflects the build environment.
    NEXT_PUBLIC_USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK ?? '(unset)',
  };

  const database: Record<string, unknown> = {
    target: maskedTarget(process.env.MONGODB_URI),
    connected: false,
  };

  if (!process.env.MONGODB_URI) {
    database.error = 'MONGODB_URI is not set on this deployment.';
  } else {
    try {
      // A short timeout so a blocked IP fails fast instead of hitting the
      // platform's function timeout and returning a generic gateway error.
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
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
      database,
      node: process.version,
      tookMs: Date.now() - started,
    },
    { status: healthy ? 200 : 503 }
  );
}
