import { requireAdmin } from '@/server/auth';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import Transaction from '@/server/models/Transaction';

// PUT /api/admin/transactions/:id/reject
export const PUT = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const { reason } = await body(req);

  const transaction = await Transaction.findById(id);
  if (!transaction) return fail('Transaction not found', 404);
  if (transaction.status !== 'pending') return fail('Transaction already processed', 400);

  transaction.status = 'rejected';
  transaction.rejectionReason = reason || 'No reason provided';
  await transaction.save();

  return ok({ message: 'Transaction rejected' });
});
