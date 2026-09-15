import { requireAdmin, requireUser } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import Package from '@/server/models/Package';
import Subscription from '@/server/models/Subscription';
import User from '@/server/models/User';

// POST /api/subscriptions — user requests a subscription (admin approves later)
export const POST = handler(async (req: Request) => {
  const authUser = await requireUser(req);
  const {
    package: packageType,
    paymentMethod,
    transactionId,
    senderNumber,
    address,
    zone,
  } = await body(req);

  // A subscription request is a claim that money was sent, so it has to carry
  // something the admin can check against their bKash/Nagad statement. Without
  // this the request arrived with nothing to verify.
  if (!transactionId || String(transactionId).trim().length < 6) {
    return fail('ট্রানজেকশন আইডি দিন', 400);
  }

  const user = await User.findById(authUser._id);
  if (!user) return fail('User not found', 404);

  const packageData = await Package.findOne({ name: packageType });
  if (!packageData) return fail('Package not found', 404);

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + packageData.duration);

  const details = {
    userName: user.fullName,
    phoneNumber: user.phoneNumber,
    email: user.email,
    package: packageType,
    packageName: packageData.title,
    amount: packageData.price,
    startDate,
    endDate,
    paymentMethod,
    transactionId: String(transactionId).trim(),
    senderNumber: senderNumber ? String(senderNumber).trim() : undefined,
    address: address || user.address,
    zone: zone || user.zone,
  };

  /**
   * One subscription document per customer, for their whole lifetime.
   *
   * This used to insert a new document on every request, and only blocked
   * while an existing one was pending or active. So a customer who was
   * rejected and asked again ended up with two rows, three rows, more — and
   * the admin subscriber list showed the same account once per attempt.
   * A re-request now reopens the existing record instead.
   */
  const existing = await Subscription.findOne({ userId: authUser._id });

  if (existing) {
    if (existing.status === 'pending' || existing.status === 'active') {
      return fail('আপনার একটি সাবস্ক্রিপশন রিকোয়েস্ট ইতিমধ্যে চালু আছে', 400);
    }

    existing.set({
      ...details,
      status: 'pending',
      paymentStatus: 'pending',
      // A fresh attempt starts clean — the previous rejection does not apply.
      cancellationReason: undefined,
      cancelledBy: undefined,
    });
    const reopened = await existing.save();
    return ok({ data: reopened });
  }

  const subscription = await Subscription.create({ userId: authUser._id, ...details });
  return ok({ data: subscription }, 201);
});

// GET /api/subscriptions — admin, with filters
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);

  const params = new URL(req.url).searchParams;
  const query: Record<string, unknown> = {};

  const status = params.get('status');
  const packageType = params.get('package');
  if (status) query.status = status;
  if (packageType) query.package = packageType;

  const subscriptions = await Subscription.find(query).sort({ createdAt: -1 });

  /**
   * One row per customer — the newest.
   *
   * New requests reuse a customer's existing document (see POST), but accounts
   * that asked more than once before that change still have several rows, and
   * the admin list showed the same person once per attempt. Collapsing here
   * fixes the display without deleting anyone's history.
   */
  const latestPerUser = new Map<string, (typeof subscriptions)[number]>();
  for (const sub of subscriptions) {
    const key = String(sub.userId);
    const seen = latestPerUser.get(key);
    if (!seen || new Date(sub.createdAt) > new Date(seen.createdAt)) {
      latestPerUser.set(key, sub);
    }
  }

  const data = [...latestPerUser.values()];
  return ok({ count: data.length, data });
});
