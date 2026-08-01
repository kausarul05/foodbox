import { requireUser } from '@/server/auth';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import Subscription from '@/server/models/Subscription';

// PUT /api/subscriptions/:id/cancel — the owning user
export const PUT = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  const { reason } = await body(req);

  const subscription = await Subscription.findById(id);
  if (!subscription) return fail('Subscription not found', 404);

  if (subscription.userId.toString() !== user._id.toString()) {
    return fail('Not authorized', 401);
  }

  subscription.status = 'cancelled';
  subscription.cancelledBy = 'user';
  subscription.cancellationReason = reason;

  const updated = await subscription.save();
  return ok({ data: updated });
});
