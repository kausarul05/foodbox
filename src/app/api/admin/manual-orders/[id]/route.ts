import { requireAdmin } from '@/server/auth';
import { fail, handler, ok, type RouteContext } from '@/server/http';
import ManualOrder from '@/server/models/ManualOrder';

// DELETE /api/admin/manual-orders/:id
export const DELETE = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdmin(req);
  const { id } = await ctx.params;

  const result = await ManualOrder.deleteOne({ _id: id });
  if (result.deletedCount === 0) return fail('Order not found', 404);

  return ok({ message: 'Order deleted' });
});
