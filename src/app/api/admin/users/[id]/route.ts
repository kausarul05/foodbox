import { authorize, requireAdmin } from '@/server/auth';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import User from '@/server/models/User';

type Ctx = RouteContext<{ id: string }>;

// GET /api/admin/users/:id — super_admin | manager
export const GET = handler(async (req: Request, ctx: Ctx) => {
  authorize(await requireAdmin(req), 'super_admin', 'manager');
  const { id } = await ctx.params;

  const user = await User.findById(id).select('-password');
  if (!user) return fail('User not found', 404);

  return ok({ data: user });
});

// PUT /api/admin/users/:id — super_admin
export const PUT = handler(async (req: Request, ctx: Ctx) => {
  authorize(await requireAdmin(req), 'super_admin');
  const { id } = await ctx.params;

  const user = await User.findByIdAndUpdate(id, await body(req), {
    new: true,
    runValidators: true,
  }).select('-password');
  if (!user) return fail('User not found', 404);

  return ok({ data: user });
});

// DELETE /api/admin/users/:id — super_admin
export const DELETE = handler(async (req: Request, ctx: Ctx) => {
  authorize(await requireAdmin(req), 'super_admin');
  const { id } = await ctx.params;

  const result = await User.deleteOne({ _id: id });
  if (result.deletedCount === 0) return fail('User not found', 404);

  return ok({ message: 'User deleted successfully' });
});
