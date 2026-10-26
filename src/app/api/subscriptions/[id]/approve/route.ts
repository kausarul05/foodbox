import { cashReference } from '@/lib/payment';
import { requireAdmin } from '@/server/auth';
import { fail, handler, ok, type RouteContext } from '@/server/http';
import Subscription from '@/server/models/Subscription';
import Transaction from '@/server/models/Transaction';
import User from '@/server/models/User';
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

  /**
   * The joining payment's food float becomes wallet balance, before the box
   * deposit is held — the hold reduces what is available to order with, so the
   * money has to be there first or the customer lands on "deposit due".
   *
   * `walletCreditedAt` is claimed with a conditional update rather than a
   * read-then-write, so an admin double-clicking approve cannot credit twice:
   * the second call matches nothing and skips.
   */
  let credited = 0;
  const float = updated.walletCredit ?? 0;
  if (float > 0) {
    // `field: null` matches both an explicit null and a missing field, so this
    // claims the credit whether the subscription predates these fields or not.
    const claimed = await Subscription.findOneAndUpdate(
      { _id: updated._id, walletCreditedAt: null },
      { $set: { walletCreditedAt: new Date() } },
      { new: true }
    );
    if (claimed) {
      const user = await User.findById(updated.userId);
      if (!user) return fail('User not found', 404);

      // Recorded as an approved top-up so it shows in the customer's wallet
      // history and counts as `customerRecharge` — their money, not revenue.
      // The provider reference is kept for reconciliation, prefixed so it
      // cannot collide with a top-up the customer submits themselves.
      const reference = updated.transactionId?.trim() || cashReference();
      await Transaction.create({
        userId: user._id,
        userName: user.fullName,
        amount: float,
        transactionId: `JOIN-${reference}`,
        paymentMethod: updated.paymentMethod ?? 'bkash',
        status: 'approved',
        approvedBy: admin._id,
        approvedAt: new Date(),
      });

      user.walletBalance += float;
      await user.save();
      credited = float;
    }
  }

  // An approved subscriber gets a food box, so the box deposit starts being
  // held now (src/server/deposit.ts). Already held — a renewal — is a no-op.
  await holdDeposit(subscription.userId, { id: admin._id, name: admin.fullName }, 'সাবস্ক্রিপশন অনুমোদন');

  return ok({ data: updated, walletCredited: credited });
});
