import { authorize, requireAdmin } from '@/server/auth';
import { handler, ok } from '@/server/http';
import User from '@/server/models/User';

// GET /api/admin/users — super_admin | manager
export const GET = handler(async (req: Request) => {
  authorize(await requireAdmin(req), 'super_admin', 'manager');
  const users = await User.find().select('-password');
  return ok({ data: users });
});
