import { requireAdmin } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Subscription from '@/server/models/Subscription';

// GET /api/subscriptions/pending — admin
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);
  const subscriptions = await Subscription.find({ status: 'pending' }).sort({ createdAt: 1 });
  return ok({ count: subscriptions.length, data: subscriptions });
});
