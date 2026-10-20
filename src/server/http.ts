import { NextResponse } from 'next/server';
import { connectDB } from './db';
import { syncSheetsLater } from './sheets';

/**
 * Response helpers matching the old Express backend's envelope exactly:
 * `{ success, data?, message?, ... }`. Keeping the shape identical means the
 * front-end and admin clients need no changes when they switch off mock data.
 */

export type Json = Record<string, unknown>;

export function ok(body: Json = {}, status = 200) {
  return NextResponse.json({ success: true, ...body }, { status });
}

export function fail(message: string, status = 400, extra: Json = {}) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

/** Thrown by guards and controllers to short-circuit with a specific status. */
export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Routes that change nothing worth mirroring, or must not trigger a mirror.
 *
 * Logging in and asking for a password-reset code write only to fields the
 * sheet does not carry, and the sync route itself would otherwise sync in a
 * loop. Everything else that writes is mirrored, including routes added later —
 * that is the point of hooking it here rather than in each handler.
 */
const NO_MIRROR = [
  '/api/auth/login',
  '/api/auth/admin/login',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/admin/sheets/sync',
];

/**
 * Mirror the database into the owner's Google Sheet after a successful write.
 *
 * `syncSheetsLater` runs on `after()` and swallows its own errors, so a broken
 * sheet or a dead network cannot fail the customer's request — and when no
 * sheet is configured it returns immediately.
 */
function mirrorAfterWrite(first: unknown, response: Response): void {
  if (!(first instanceof Request)) return;
  if (first.method === 'GET' || first.method === 'HEAD' || first.method === 'OPTIONS') return;
  if (!response.ok) return;

  const path = new URL(first.url).pathname;
  if (NO_MIRROR.some((skip) => path.startsWith(skip))) return;

  syncSheetsLater(`${first.method} ${path}`);
}

/**
 * Wraps a route handler: connects to Mongo, converts HttpError into the right
 * status, and turns anything unexpected into a 500 — the job `errorHandler`
 * middleware did in Express.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      await connectDB();
      const response = await fn(...args);
      mirrorAfterWrite(args[0], response);
      return response;
    } catch (error) {
      if (error instanceof HttpError) {
        return fail(error.message, error.status);
      }
      const message = error instanceof Error ? error.message : 'Server error';
      console.error('[api]', message, error);
      return fail(message, 500);
    }
  };
}

/**
 * An unvalidated JSON request body. Values are `any` on purpose: handlers pass
 * them straight to Mongoose, which does the casting and validation. Narrow it
 * per-route with `body<{ ... }>(req)` wherever the shape is known.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonBody = Record<string, any>;

/** Reads and parses a JSON body, tolerating an empty one. */
export async function body<T = JsonBody>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

/** Next 15+ passes route params as a promise. */
export type RouteContext<P extends Record<string, string> = Record<string, string>> = {
  params: Promise<P>;
};
