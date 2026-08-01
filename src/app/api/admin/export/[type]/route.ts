import { authorize, requireAdmin } from '@/server/auth';
import { handler, ok, type RouteContext } from '@/server/http';
import Order from '@/server/models/Order';
import Subscription from '@/server/models/Subscription';
import User from '@/server/models/User';

// GET /api/admin/export/:type — super_admin | manager
export const GET = handler(async (req: Request, ctx: RouteContext<{ type: string }>) => {
  authorize(await requireAdmin(req), 'super_admin', 'manager');
  const { type } = await ctx.params;

  let data: unknown[] = [];
  if (type === 'orders') data = await Order.find();
  else if (type === 'users') data = await User.find().select('-password');
  else if (type === 'subscriptions') data = await Subscription.find();

  return ok({ data, count: data.length });
});
