import { generateToken } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import Admin from '@/server/models/Admin';

// POST /api/auth/admin/login
export const POST = handler(async (req: Request) => {
  const { email, password } = await body(req);

  const admin = await Admin.findOne({ email });
  if (!admin || !(await admin.matchPassword(password))) {
    return fail('Invalid email or password', 401);
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
