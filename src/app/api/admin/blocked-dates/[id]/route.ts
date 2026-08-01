import { requireAdmin } from '@/server/auth';
import { handler, ok, type RouteContext } from '@/server/http';
import BlockedDate from '@/server/models/BlockedDate';

// DELETE /api/admin/blocked-dates/:id
export const DELETE = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdmin(req);
  const { id } = await ctx.params;

  await BlockedDate.findByIdAndDelete(id);
  return ok({ message: 'Blocked date removed' });
});
