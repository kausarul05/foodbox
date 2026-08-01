import { requireAdmin } from '@/server/auth';
import { fail, handler, ok, type RouteContext } from '@/server/http';
import Transaction from '@/server/models/Transaction';
import User from '@/server/models/User';

// PUT /api/admin/transactions/:id/approve — credits the user's wallet
export const PUT = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;

  const transaction = await Transaction.findById(id);
  if (!transaction) return fail('Transaction not found', 404);
  if (transaction.status !== 'pending') return fail('Transaction already processed', 400);

  const user = await User.findById(transaction.userId);
  if (!user) return fail('User not found', 404);

  transaction.status = 'approved';
  transaction.approvedBy = admin._id;
  transaction.approvedAt = new Date();
  await transaction.save();

  user.walletBalance += transaction.amount;
  await user.save();

  return ok({
    message: 'Transaction approved and wallet updated',
    data: { walletBalance: user.walletBalance },
  });
});
