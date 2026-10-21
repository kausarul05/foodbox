import { generateToken } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import Admin from '@/server/models/Admin';

// POST /api/auth/admin/login
export const POST = handler(async (req: Request) => {
  const { email, password } = await body(req);

  /**
   * Setup stores the address lowercased, but older admins were created with
   * whatever case was typed. Try the address as given, then folded — so an
   * owner who set up as "Owner@..." still gets in typing "owner@...", and an
   * existing admin with capitals is unaffected.
   */
  const typed = String(email ?? '').trim();
  const admin =
    (await Admin.findOne({ email: typed })) ?? (await Admin.findOne({ email: typed.toLowerCase() }));
  if (!admin || !(await admin.matchPassword(password))) {
    return fail('ইমেইল বা পাসওয়ার্ড ভুল', 401);
  }

  admin.lastLogin = new Date();
  await admin.save();

  return ok({
    data: {
      _id: admin._id,
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
      token: generateToken(admin._id.toString()),
    },
  });
});
