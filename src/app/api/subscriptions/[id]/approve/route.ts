import { requireAdmin } from '@/server/auth';
import { fail, handler, ok, type RouteContext } from '@/server/http';
import Subscription from '@/server/models/Subscription';
import { holdDeposit } from '@/server/deposit';

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

  // An approved subscriber gets a food box, so the box deposit starts being
  // held now (src/server/deposit.ts). Already held — a renewal — is a no-op.
  await holdDeposit(subscription.userId, { id: admin._id, name: admin.fullName }, 'সাবস্ক্রিপশন অনুমোদন');

  return ok({ data: updated });
});
