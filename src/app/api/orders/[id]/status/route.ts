import { requireAdmin } from '@/server/auth';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import Order from '@/server/models/Order';
import { deliverOrders } from '@/server/wallet';

// PUT /api/orders/:id/status — admin
//
// No admin page calls this any more (the order list uses
// /api/admin/orders/batch-status), but it stays reachable, so it must not be
// a way round the wallet rules: delivering charges a reserved wallet order,
// and cancelling goes through the customer's cancel route, which refunds.
export const PUT = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const { status } = await body(req);

  const order = await Order.findById(id);
  if (!order) return fail('Order not found', 404);

  if (status === 'cancelled') return fail('Cancel the order through its cancel route', 400);

  if (status === 'delivered') {
    await deliverOrders([id], ['pending', 'confirmed', 'preparing', 'out_for_delivery']);
    return ok({ data: await Order.findById(id) });
  }

  order.status = status;
  const updated = await order.save();

  return ok({ data: updated });
});
