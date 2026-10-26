import { bn } from '@/lib/format';
import { cashReference, isHandCash } from '@/lib/payment';
import { MIN_RECHARGE } from '@/lib/rules';
import { baseUrlFrom, notifyAdminLater, rechargeAlert } from '@/server/adminNotify';
import { requireUser } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import Subscription from '@/server/models/Subscription';
import Transaction from '@/server/models/Transaction';
import User from '@/server/models/User';

// POST /api/wallet/recharge — user submits a manual payment for admin approval
export const POST = handler(async (req: Request) => {
  const authUser = await requireUser(req);
  const { amount, transactionId: given, paymentMethod } = await body(req);

  const user = await User.findById(authUser._id);
  if (!user) return fail('User not found', 404);

  // The wallet only pays for subscriber meals, so only subscribers can fill it.
  const subscribed = await Subscription.exists({ userId: authUser._id, status: 'active' });
  if (!subscribed) {
    return fail('শুধু সাবস্ক্রাইবাররা ওয়ালেটে টাকা যোগ করতে পারেন। আগে একটি প্যাকেজ নিন।', 403);
  }

  /**
   * Any amount from MIN_RECHARGE up. The old ৳1,200 first-top-up minimum is
   * gone: the first week of food is funded by the joining payment now
   * (POST /api/subscriptions), so there is nothing left for a top-up to
   * guarantee.
   */
  const value = Number(amount);
  if (!Number.isFinite(value) || value < MIN_RECHARGE) {
    return fail(`ন্যূনতম ${bn(MIN_RECHARGE)} টাকা রিচার্জ করতে হবে`, 400);
  }
  // Still wanted for the alert, which says whether this is their first top-up.
  const hasApproved = await Transaction.exists({ userId: authUser._id, status: 'approved' });

  // Hand cash has no provider id, so it gets a reference of our own. The
  // admin approves it once the money is actually in hand.
  const transactionId = isHandCash(paymentMethod) ? cashReference() : given;

  const existing = await Transaction.findOne({ transactionId });
  if (existing) return fail('এই ট্রানজেকশন আইডি already ব্যবহার করা হয়েছে', 400);

  const transaction = await Transaction.create({
    userId: authUser._id,
    userName: user.fullName,
    amount: value,
    transactionId,
    paymentMethod,
    status: 'pending',
  });

  // The money is not credited until an admin approves, so tell them it is here.
  // Never throws — a mail failure must not undo a request already written.
  notifyAdminLater(
    rechargeAlert({
      userName: user.fullName,
      phoneNumber: user.phoneNumber,
      amount: value,
      paymentMethod,
      transactionId,
      first: !hasApproved,
      baseUrl: baseUrlFrom(req),
    })
  );

  return ok({ data: transaction }, 201);
});
