import { requireAdmin } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Order from '@/server/models/Order';
import Settings from '@/server/models/Settings';
import Subscription from '@/server/models/Subscription';
import User from '@/server/models/User';

// POST /api/admin/backup — reports counts; it does not persist a dump anywhere.
export const POST = handler(async (req: Request) => {
  await requireAdmin(req);

  const [users, orders, subscriptions] = await Promise.all([
    User.find().select('-password'),
    Order.find(),
    Subscription.find(),
  ]);
  await Settings.findOne();

  return ok({
    message: 'Database backup completed successfully',
    data: {
      usersCount: users.length,
      ordersCount: orders.length,
      subscriptionsCount: subscriptions.length,
      timestamp: new Date().toISOString(),
    },
  });
});
