import { requireAdmin } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Order from '@/server/models/Order';
import Subscription from '@/server/models/Subscription';
import User from '@/server/models/User';

// GET /api/admin/stats
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);

  const [totalUsers, activeUsers, totalOrders, pendingOrders, revenue, activeSubs, pendingSubs] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'pending' }),
    ]);

  return ok({
    data: {
      users: { total: totalUsers, active: activeUsers },
      orders: { total: totalOrders, pending: pendingOrders },
      revenue: { total: revenue[0]?.total ?? 0 },
      subscriptions: { active: activeSubs, pending: pendingSubs },
    },
  });
});
