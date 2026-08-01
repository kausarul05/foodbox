import { requireAdmin } from '@/server/auth';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import Order from '@/server/models/Order';

// PUT /api/orders/:id/status — admin
export const PUT = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const { status } = await body(req);

  const order = await Order.findById(id);
  if (!order) return fail('Order not found', 404);

  order.status = status;
  const updated = await order.save();

  return ok({ data: updated });
});
