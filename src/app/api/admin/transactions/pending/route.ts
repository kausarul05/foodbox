import { requireAdmin } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Transaction from '@/server/models/Transaction';

// GET /api/admin/transactions/pending
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);
  const transactions = await Transaction.find({ status: 'pending' }).sort({ createdAt: -1 });
  return ok({ data: transactions });
});
