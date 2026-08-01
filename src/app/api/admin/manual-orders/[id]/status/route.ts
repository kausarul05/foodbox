import { requireAdmin } from '@/server/auth';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import ManualOrder from '@/server/models/ManualOrder';

// PUT /api/admin/manual-orders/:id/status
export const PUT = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const { status } = await body(req);

  const order = await ManualOrder.findById(id);
  if (!order) return fail('Order not found', 404);

  order.status = status;
  await order.save();

  return ok({ data: order });
});
