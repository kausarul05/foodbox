import mongoose from 'mongoose';

/**
 * Mongoose connection for Next.js.
 *
 * Route handlers run in a serverless-style environment where the module graph is
 * re-evaluated often and dev mode hot-reloads on every edit. Caching the
 * connection promise on `globalThis` keeps a single pooled connection instead of
 * opening a new one per request (which exhausts Atlas connection limits fast).
 */

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

/** mongoose.ConnectionStates: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting. */
const CONNECTED = 1;

export async function connectDB(): Promise<typeof mongoose> {
  // Reuse the cached connection only while the socket is actually alive.
  //
  // A serverless instance is frozen between invocations and Atlas closes idle
  // sockets, so `cache.conn` routinely outlives the connection it points at.
  // Returning it blindly means every query runs against a dead socket — and
  // with bufferCommands:false that fails instantly rather than reconnecting,
  // which looks like the API working right after a deploy and breaking later.
  if (cache.conn && mongoose.connection.readyState === CONNECTED) {
    return cache.conn;
  }

  // Stale: drop it so a fresh connection is dialled below.
  if (cache.conn) {
    cache.conn = null;
    cache.promise = null;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add it to .env.local — see .env.example.');
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      // Fail fast. The default is 30s, which on a serverless host outlives the
      // function timeout — the caller then sees an opaque gateway error instead
      // of the real reason. 8s is well inside every platform's default limit.
      serverSelectionTimeoutMS: 8000,
      // Each serverless instance keeps its own pool; the driver default of 100
      // will exhaust an Atlas shared tier once a few instances are warm.
      maxPoolSize: 10,
      // Retire sockets before Atlas does, so a stale one is replaced on our
      // terms instead of failing mid-query.
      maxIdleTimeMS: 60_000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Let the next request retry instead of caching a rejected promise forever.
    cache.promise = null;

    const message = error instanceof Error ? error.message : String(error);
    if (/ServerSelection|ETIMEDOUT|querySrv|ENOTFOUND/i.test(message)) {
      throw new Error(
        `Could not reach MongoDB (${message.split('\n')[0]}). ` +
          'If this works locally but not on the deployed site, the host IP is almost ' +
          'certainly not on the Atlas Network Access list — add 0.0.0.0/0. ' +
          'Check GET /api/health for details.'
      );
    }
    throw error;
  }

  return cache.conn;
}

export default connectDB;
