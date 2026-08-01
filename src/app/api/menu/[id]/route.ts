import { requireAdmin } from '@/server/auth';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import WeeklyMenu from '@/server/models/WeeklyMenu';

type Ctx = RouteContext<{ id: string }>;

// PUT /api/menu/:id — admin
export const PUT = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;

  const updated = await WeeklyMenu.findByIdAndUpdate(id, await body(req), {
    new: true,
    runValidators: true,
  });
  if (!updated) return fail('Menu item not found', 404);

  return ok({ data: updated });
});

// DELETE /api/menu/:id — admin
// The Express version called the removed `doc.remove()`, so this route always
// 500'd on Mongoose 7+. deleteOne() is the supported replacement.
export const DELETE = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;

  const result = await WeeklyMenu.deleteOne({ _id: id });
  if (result.deletedCount === 0) return fail('Menu item not found', 404);

  return ok({ message: 'Menu item removed' });
});
