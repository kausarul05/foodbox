import { requireUser } from '@/server/auth';
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
