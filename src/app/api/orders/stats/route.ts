import { requireAdmin } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Order from '@/server/models/Order';

// GET /api/orders/stats — admin
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);

  const [totalOrders, pendingOrders, deliveredOrders, totalRevenue, monthlyOrders] =
    await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        {
          $group: {
            _id: { $month: '$createdAt' },
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

  return ok({
    data: {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenue: totalRevenue[0]?.total ?? 0,
      monthlyOrders,
    },
  });
});
