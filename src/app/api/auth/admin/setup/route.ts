import { generateToken } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import Admin, { type AdminPermission } from '@/server/models/Admin';
import { MIN_PASSWORD_LENGTH } from '@/server/passwordReset';

/**
 * First-run setup for the admin panel — the handover screen.
 *
 * The panel used to ship with a seeded admin whose email and password were
 * printed on the login page. Handing the site to its owner meant telling them
 * a password we had both seen. Instead, when the Admin collection is empty the
 * login page asks for an email and a password and creates the account from
 * them, so the first person to open the panel is the only one who ever knows
 * the credentials.
 *
 * The guard is the collection being empty — nothing else. That makes the
 * endpoint safe to leave enabled forever: the moment an admin exists it is a
 * 409 for everyone, and the only way back is deleting every admin from the
 * database (`node scripts/reset-admin.mjs`), which needs database access
 * already. It is deliberately *not* behind SETUP_SECRET like
 * `POST /api/setup/admin`: that one can overwrite an existing admin's
 * password, which is why it needs a secret and must stay off in production.
 */

const FULL_PERMISSIONS: AdminPermission[] = [
  'manage_packages',
  'manage_menu',
  'manage_orders',
  'manage_users',
  'manage_subscriptions',
  'view_reports',
];

// GET /api/auth/admin/setup — does the panel still need its first admin?
export const GET = handler(async () => {
  const admins = await Admin.countDocuments({});
  return ok({ data: { needsSetup: admins === 0 } });
});

// POST /api/auth/admin/setup — create that first admin and log them in
export const POST = handler(async (req: Request) => {
  if ((await Admin.countDocuments({})) > 0) {
    return fail('অ্যাডমিন অ্যাকাউন্ট আগেই তৈরি করা হয়েছে। লগইন করুন।', 409);
  }

  const { fullName, email, password } = await body<{
    fullName?: string;
    email?: string;
    password?: string;
  }>(req);

  // Stored lowercase so "Owner@…" and "owner@…" cannot become two accounts —
  // the login route looks the address up exactly as typed.
  const mail = String(email ?? '')
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return fail('সঠিক ইমেইল ঠিকানা দিন', 400);

  const pass = String(password ?? '');
  if (pass.length < MIN_PASSWORD_LENGTH) {
    return fail(`পাসওয়ার্ড কমপক্ষে ${MIN_PASSWORD_LENGTH} অক্ষরের হতে হবে`, 400);
  }

  const admin = await Admin.create({
    fullName: String(fullName ?? '').trim() || 'Super Admin',
    email: mail,
    password: pass,
    role: 'super_admin',
    permissions: FULL_PERMISSIONS,
    isActive: true,
  });

  /**
   * Two submits racing each other both pass the count check above, and two
   * different addresses slip past the unique index on `email`. Settle it after
   * the fact rather than with a lock: both requests sort the collection the
   * same way, so both pick the same winner and only the loser deletes itself.
   */
  if ((await Admin.countDocuments({})) > 1) {
    const [first] = await Admin.find().sort({ createdAt: 1, _id: 1 }).limit(1).select('_id').lean();
    if (!first || String(first._id) !== String(admin._id)) {
      await Admin.deleteOne({ _id: admin._id });
      return fail('অ্যাডমিন অ্যাকাউন্ট আগেই তৈরি করা হয়েছে। লগইন করুন।', 409);
    }
  }

  // Same payload the login route returns, so the page stores the session the
  // same way and the owner lands in the dashboard instead of retyping it all.
  return ok(
    {
      data: {
        _id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        token: generateToken(admin._id.toString()),
      },
    },
    201
  );
});
