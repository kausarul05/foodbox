import { requireAdmin } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Order from '@/server/models/Order';
import User from '@/server/models/User';

// GET /api/admin/activities
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);

  const [recentOrders, recentUsers] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).limit(10),
    User.find().sort({ createdAt: -1 }).limit(10).select('fullName phoneNumber createdAt'),
  ]);

  const activities = [
    ...recentOrders.map(order => ({
      type: 'order' as const,
      title: `New order #${order.orderId}`,
      time: order.createdAt,
    })),
    ...recentUsers.map(user => ({
      type: 'user' as const,
      title: `New user registered: ${user.fullName}`,
      time: user.createdAt,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return ok({ data: activities.slice(0, 20) });
});
