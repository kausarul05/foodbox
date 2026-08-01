import { requireUser } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Transaction from '@/server/models/Transaction';

// GET /api/wallet/transactions — user
export const GET = handler(async (req: Request) => {
  const user = await requireUser(req);
  const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 });
  return ok({ data: transactions });
});
