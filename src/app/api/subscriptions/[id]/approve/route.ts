import { requireAdmin } from '@/server/auth';
import { fail, handler, ok, type RouteContext } from '@/server/http';
import Subscription from '@/server/models/Subscription';

// PUT /api/subscriptions/:id/approve — admin
export const PUT = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;

  const subscription = await Subscription.findById(id);
  if (!subscription) return fail('Subscription not found', 404);

  subscription.status = 'active';
  subscription.paymentStatus = 'paid';
  subscription.approvedBy = admin._id;
  subscription.approvedAt = new Date();

  // The Express version also wrote `package` / `subscriptionActive` onto the User
  // document; neither field exists in the User schema, so strict mode dropped
  // them silently. Left out rather than carried over as a no-op.
  const updated = await subscription.save();
  return ok({ data: updated });
});
