import { requireAdmin } from '@/server/auth';
import { handler, ok } from '@/server/http';
import ManualOrder from '@/server/models/ManualOrder';
import Order from '@/server/models/Order';
import Subscription from '@/server/models/Subscription';
import User from '@/server/models/User';

/** Sum of delivered orders, delivery charges included. */
const DELIVERED_TOTAL = [
  { $match: { status: 'delivered' } },
  { $group: { _id: null, total: { $sum: { $add: ['$totalAmount', { $ifNull: ['$deliveryCharge', 0] }] } } } },
];

/**
 * Sum of subscription fees actually paid.
 *
 * Matched on paymentStatus, not status: the fee is non-refundable, so a
 * subscription that was later cancelled or expired still earned it.
 */
const PAID_FEE_TOTAL = [
  { $match: { paymentStatus: 'paid' } },
  { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
];

// GET /api/admin/stats
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);

  const [totalUsers, activeUsers, totalOrders, pendingOrders, revenue, activeSubs, pendingSubs] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      // Same definition as GET /api/admin/profit-stats, so the two "মোট রেভিনিউ"
      // cards never disagree: everything delivered (wallet, cash on delivery and
      // admin manual orders) plus the non-refundable subscription fees. Wallet
      // top-ups are excluded there and here — the delivered order already counts
      // that money.
      Promise.all([
        Order.aggregate(DELIVERED_TOTAL),
        ManualOrder.aggregate(DELIVERED_TOTAL),
        Subscription.aggregate(PAID_FEE_TOTAL),
      ]).then(([orders, manual, fees]) => [
        { total: (orders[0]?.total ?? 0) + (manual[0]?.total ?? 0) + (fees[0]?.total ?? 0) },
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
