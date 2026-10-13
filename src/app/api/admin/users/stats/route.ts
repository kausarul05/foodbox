import { authorize, requireAdmin } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Order from '@/server/models/Order';
import Transaction from '@/server/models/Transaction';
import User from '@/server/models/User';

/**
 * GET /api/admin/users/stats
 *
 * Per-customer figures the subscriber screen needs: how many orders they have
 * placed, how much they have topped up, and what is left in the wallet.
 *
 * Aggregated in one request rather than fetched per row — the subscriber list
 * would otherwise fire three calls per customer.
 */
export const GET = handler(async (req: Request) => {
  authorize(await requireAdmin(req), 'super_admin', 'manager');

  const [orderRows, rechargeRows, users] = await Promise.all([
    // Cancelled orders are not something the customer received, so they do not
    // count towards "how many orders has this person placed".
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: '$userId', orders: { $sum: 1 }, spent: { $sum: '$totalAmount' } } },
    ]),
    // Only approved top-ups ever reached the wallet.
    Transaction.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$userId', recharged: { $sum: '$amount' } } },
    ]),
    User.find().select('_id walletBalance'),
  ]);

  const byUser: Record<
    string,
    { orders: number; spent: number; recharged: number; walletBalance: number }
  > = {};

  const seed = (id: string) => (byUser[id] ??= { orders: 0, spent: 0, recharged: 0, walletBalance: 0 });

  for (const row of orderRows) {
    const entry = seed(String(row._id));
    entry.orders = row.orders ?? 0;
    entry.spent = row.spent ?? 0;
  }
  for (const row of rechargeRows) {
    seed(String(row._id)).recharged = row.recharged ?? 0;
  }
  for (const user of users) {
    seed(String(user._id)).walletBalance = user.walletBalance ?? 0;
  }

  return ok({ data: byUser });
});
