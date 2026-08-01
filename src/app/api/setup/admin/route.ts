import { body, fail, handler, ok } from '@/server/http';
import Admin from '@/server/models/Admin';

/**
 * Creates the first super admin.
 *
 * The Express version was a public endpoint that reset admin@foodbox.com's
 * password to a hardcoded 'admin@123' — anyone who found the URL owned the
 * panel. This requires SETUP_SECRET and takes the password from the request.
 */

// POST /api/setup/admin
export const POST = handler(async (req: Request) => {
  const expected = process.env.SETUP_SECRET;
  if (!expected) return fail('SETUP_SECRET is not configured', 503);
  if (req.headers.get('x-setup-secret') !== expected) return fail('Invalid setup secret', 401);

  const { email, password, fullName } = await body<{
    email?: string;
    password?: string;
    fullName?: string;
  }>(req);

  if (!email || !password) return fail('email and password are required', 400);
  if (password.length < 8) return fail('Password must be at least 8 characters', 400);

  const existing = await Admin.findOne({ email });
  if (existing) {
    existing.password = password;
    await existing.save();
    return ok({
      message: 'Admin password updated',
      data: { email: existing.email, fullName: existing.fullName, role: existing.role },
    });
  }

  const admin = await Admin.create({
    fullName: fullName || 'Super Admin',
    email,
    password,
    role: 'super_admin',
    permissions: [
      'manage_packages',
      'manage_menu',
      'manage_orders',
      'manage_users',
      'manage_subscriptions',
      'view_reports',
    ],
    isActive: true,
  });

  return ok(
    {
      message: 'Admin created successfully',
      data: { email: admin.email, fullName: admin.fullName, role: admin.role },
    },
    201
  );
});
