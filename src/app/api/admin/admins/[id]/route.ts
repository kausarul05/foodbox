import { authorize, requireAdmin } from '@/server/auth';
import { fail, handler, ok, type RouteContext } from '@/server/http';
import Admin from '@/server/models/Admin';

// DELETE /api/admin/admins/:id — super_admin
export const DELETE = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  authorize(await requireAdmin(req), 'super_admin');
  const { id } = await ctx.params;

  const result = await Admin.deleteOne({ _id: id });
  if (result.deletedCount === 0) return fail('Admin not found', 404);

  return ok({ message: 'Admin deleted successfully' });
});
