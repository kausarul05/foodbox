import { authorize, requireAdmin } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import Admin from '@/server/models/Admin';

// GET /api/admin/admins — super_admin
export const GET = handler(async (req: Request) => {
  authorize(await requireAdmin(req), 'super_admin');
  const admins = await Admin.find().select('-password');
  return ok({ data: admins });
});

// POST /api/admin/admins — super_admin
export const POST = handler(async (req: Request) => {
  authorize(await requireAdmin(req), 'super_admin');
  const { fullName, email, password, role, permissions } = await body(req);

  const exists = await Admin.findOne({ email });
  if (exists) return fail('Admin already exists', 400);

  const admin = await Admin.create({
    fullName,
    email,
    password,
    role: role || 'manager',
    permissions: permissions || [],
  });

  return ok(
    { data: { _id: admin._id, fullName: admin.fullName, email: admin.email, role: admin.role } },
    201
  );
});
