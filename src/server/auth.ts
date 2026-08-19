import jwt from 'jsonwebtoken';
import { HttpError } from './http';
import Admin, { type AdminRole, type IAdmin } from './models/Admin';
import User, { type IUser } from './models/User';

/**
 * Replaces the Express `protect` / `adminProtect` middleware. Route handlers
 * call these guards directly instead of chaining middleware; they throw
 * `HttpError`, which `handler()` converts into the same 401/403 responses the
 * old backend returned.
 */

/**
 * Both are read at call time, not at module scope — see the note in db.ts:
 * a module-level `process.env` capture can be folded into a literal at build
 * time, so a value added to the host's settings afterwards is never picked up.
 */
function secret(): string {
  const value = process.env.JWT_SECRET?.trim();
  if (!value) {
    throw new Error(
      'JWT_SECRET is not set. Locally: add it to .env.local (see .env.example). ' +
        'On a deployed host: add it to the host environment variables and redeploy. ' +
        'Check GET /api/health to confirm what the server can actually see.'
    );
  }
  return value;
}

export function generateToken(id: string): string {
  const expiresIn = process.env.JWT_EXPIRE?.trim() || '30d';
  return jwt.sign({ id }, secret(), { expiresIn } as jwt.SignOptions);
}

function readToken(req: Request): string {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new HttpError('Not authorized, no token', 401);
  }
  return header.slice(7);
}

function verify(req: Request): string {
  try {
    const decoded = jwt.verify(readToken(req), secret()) as { id: string };
    return decoded.id;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('Not authorized, token failed', 401);
  }
}

/** Requires a logged-in user. Returns the user document without its password. */
export async function requireUser(req: Request): Promise<IUser> {
  const user = await User.findById(verify(req)).select('-password');
  if (!user) throw new HttpError('Not authorized, token failed', 401);
  return user;
}

/** Requires a logged-in admin. Returns the admin document without its password. */
export async function requireAdmin(req: Request): Promise<IAdmin> {
  const admin = await Admin.findById(verify(req)).select('-password');
  if (!admin) throw new HttpError('Not authorized as admin', 401);
  return admin;
}

/**
 * Role gate, equivalent to the old `authorize(...roles)` middleware.
 * Usage: `const admin = authorize(await requireAdmin(req), 'super_admin');`
 */
export function authorize(admin: IAdmin, ...roles: AdminRole[]): IAdmin {
  if (!roles.includes(admin.role)) {
    throw new HttpError(`Role ${admin.role} is not authorized to access this route`, 403);
  }
  return admin;
}

/** Optional auth — returns null instead of throwing when no valid token is present. */
export async function optionalUser(req: Request): Promise<IUser | null> {
  try {
    return await requireUser(req);
  } catch {
    return null;
  }
}
