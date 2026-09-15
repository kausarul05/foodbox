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

  const existing = await Subscription.findOne({
    userId: authUser._id,
    status: { $in: ['pending', 'active'] },
  });
  if (existing) {
    return fail('You already have an active or pending subscription', 400);
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + packageData.duration);

  const subscription = await Subscription.create({
    userId: authUser._id,
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
  });

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
  return ok({ count: subscriptions.length, data: subscriptions });
});
