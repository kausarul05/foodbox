import { requireAdmin } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Subscription from '@/server/models/Subscription';

// GET /api/subscriptions/stats — admin
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);

  const [active, pending, expired, totalRevenue, packageDistribution] = await Promise.all([
    Subscription.countDocuments({ status: 'active' }),
    Subscription.countDocuments({ status: 'pending' }),
    Subscription.countDocuments({ status: 'expired' }),
    Subscription.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Subscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$package', count: { $sum: 1 } } },
    ]),
  ]);

  return ok({
    data: {
      activeSubscriptions: active,
      pendingSubscriptions: pending,
      expiredSubscriptions: expired,
      totalRevenue: totalRevenue[0]?.total ?? 0,
      packageDistribution,
    },
  });
});
