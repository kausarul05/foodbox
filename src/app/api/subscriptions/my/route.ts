import { requireUser } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Subscription from '@/server/models/Subscription';
import User from '@/server/models/User';

// GET /api/subscriptions/my — user
export const GET = handler(async (req: Request) => {
  const authUser = await requireUser(req);

  const subscriptions = await Subscription.find({ userId: authUser._id }).sort({ createdAt: -1 });
  const user = await User.findById(authUser._id);

  // walletBalance rides along at the top level — several pages read it from here.
  return ok({
    count: subscriptions.length,
    data: subscriptions,
    walletBalance: user?.walletBalance ?? 0,
  });
});
