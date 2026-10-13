import { optionalUser, requireAdmin, requireUser } from '@/server/auth';
import { fail, handler, ok, type RouteContext } from '@/server/http';
import Order from '@/server/models/Order';

// GET /api/orders/:id — the owning user, or an admin-role user
export const GET = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;

  const order = await Order.findById(id);
  if (!order) return fail('Order not found', 404);

  if (order.userId.toString() !== user._id.toString() && user.role !== 'admin') {
    return fail('Not authorized', 401);
  }

  return ok({ data: order });
});

/**
 * DELETE /api/orders/:id — remove a cancelled order from the history.
 *
 * Only a cancelled order can be deleted. A pending or delivered one is the
 * record of real food and real money, so losing it would leave the day's
 * revenue unexplainable; cancelling first is the way to retire an order.
 *
 * Either the customer who owns it or an admin may do this, so the route tries
 * the admin token first and falls back to the user token.
 */
export const DELETE = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const { id } = await ctx.params;

  const order = await Order.findById(id);
  if (!order) return fail('Order not found', 404);

  let isAdmin = false;
  try {
    await requireAdmin(req);
    isAdmin = true;
  } catch {
    // Not an admin token — fall through to the owner check below.
  }

  if (!isAdmin) {
    const user = await optionalUser(req);
    if (!user) return fail('Not authorized', 401);
    if (order.userId.toString() !== user._id.toString()) return fail('Not authorized', 401);
  }

  if (order.status !== 'cancelled') {
    return fail('শুধু বাতিল হওয়া অর্ডার মুছে ফেলা যায়', 400);
  }

  await order.deleteOne();
  return ok({ message: 'Order deleted' });
});
