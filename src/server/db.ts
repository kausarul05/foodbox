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

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add it to .env.local — see .env.example.');
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Let the next request retry instead of caching a rejected promise forever.
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}

export default connectDB;
