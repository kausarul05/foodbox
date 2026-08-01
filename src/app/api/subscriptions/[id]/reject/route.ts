import { requireAdmin } from '@/server/auth';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import Subscription from '@/server/models/Subscription';

// PUT /api/subscriptions/:id/reject — admin
export const PUT = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const { reason } = await body(req);

  const subscription = await Subscription.findById(id);
  if (!subscription) return fail('Subscription not found', 404);

  subscription.status = 'cancelled';
  subscription.cancelledBy = 'admin';
  subscription.cancellationReason = reason || 'Rejected by admin';

  const updated = await subscription.save();
  return ok({ data: updated });
});
