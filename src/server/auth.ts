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

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';

function secret(): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Add it to .env.local — see .env.example.');
  }
  return JWT_SECRET;
}

export function generateToken(id: string): string {
  return jwt.sign({ id }, secret(), { expiresIn: JWT_EXPIRE } as jwt.SignOptions);
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
