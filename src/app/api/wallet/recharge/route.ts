import { cashReference, isHandCash } from '@/lib/payment';
import { requireUser } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import Transaction from '@/server/models/Transaction';
import User from '@/server/models/User';

// POST /api/wallet/recharge — user submits a manual payment for admin approval
export const POST = handler(async (req: Request) => {
  const authUser = await requireUser(req);
  const { amount, transactionId: given, paymentMethod } = await body(req);

  const user = await User.findById(authUser._id);
  if (!user) return fail('User not found', 404);

  // Hand cash has no provider id, so it gets a reference of our own. The
  // admin approves it once the money is actually in hand.
  const transactionId = isHandCash(paymentMethod) ? cashReference() : given;

  const existing = await Transaction.findOne({ transactionId });
  if (existing) return fail('এই ট্রানজেকশন আইডি already ব্যবহার করা হয়েছে', 400);

  const transaction = await Transaction.create({
    userId: authUser._id,
    userName: user.fullName,
    amount,
    transactionId,
    paymentMethod,
    status: 'pending',
  });

  return ok({ data: transaction }, 201);
});
