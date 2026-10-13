import { requireUser } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Subscription from '@/server/models/Subscription';
import { walletSummary } from '@/server/wallet';

// GET /api/subscriptions/my — user
export const GET = handler(async (req: Request) => {
  const authUser = await requireUser(req);

  const [subscriptions, wallet] = await Promise.all([
    Subscription.find({ userId: authUser._id }).sort({ createdAt: -1 }),
    walletSummary(authUser._id),
  ]);

  // The wallet rides along at the top level — several pages read it from here.
  // `walletAvailable` is what a new order can spend; see src/server/wallet.ts.
  return ok({
    count: subscriptions.length,
    data: subscriptions,
    walletBalance: wallet.balance,
    walletReserved: wallet.reserved,
    walletAvailable: wallet.available,
  });
});
