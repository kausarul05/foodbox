import { requireUser } from '@/server/auth';
import { handler, ok } from '@/server/http';
import User from '@/server/models/User';

// GET /api/wallet/balance — user
export const GET = handler(async (req: Request) => {
  const authUser = await requireUser(req);
  const user = await User.findById(authUser._id);
  return ok({ data: { balance: user?.walletBalance ?? 0 } });
});
