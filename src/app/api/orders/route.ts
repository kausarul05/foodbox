import { requireAdmin, requireUser } from '@/server/auth';
import { checkDeliveryDeadline, isClosedFriday } from '@/server/deadlines';
import { body, fail, handler, ok } from '@/server/http';
import BlockedDate from '@/server/models/BlockedDate';
import Order from '@/server/models/Order';
import Subscription from '@/server/models/Subscription';
import User from '@/server/models/User';

// POST /api/orders — user
export const POST = handler(async (req: Request) => {
  const authUser = await requireUser(req);
  const {
    items,
    totalAmount,
    deliveryCharge,
    paymentMethod,
    deliveryDate,
    deliveryTime,
    address,
    zone,
    specialInstructions,
    package: packageName,
  } = await body(req);

  const user = await User.findById(authUser._id);
  if (!user) return fail('User not found', 404);

  const orderDate = new Date(deliveryDate);

  // 1. Admin-blocked date
  const dayStart = new Date(deliveryDate);
  dayStart.setHours(0, 0, 0, 0);
  const blocked = await BlockedDate.findOne({
    date: { $gte: dayStart, $lt: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) },
  });
  if (blocked) {
    return fail(blocked.reason || 'অনিবার্য কারনবশত আজ মিল বন্ধ থাকবে', 400, { isBlocked: true });
  }

  // 2. Kitchen closed on the 2nd and last Friday of the month
  if (isClosedFriday(orderDate)) {
    return fail('প্রতি মাসের ২য় ও লাস্ট শুক্রবার মিল বন্ধ থাকে। আগামীকাল অর্ডার করুন।', 400, {
      isFridayClosed: true,
    });
  }

  // 3. Ordering cut-off
  const deadline = checkDeliveryDeadline(orderDate, deliveryTime);
  if (!deadline.isWithinDeadline) return fail(deadline.message, 400);

  // 4. Wallet payments require an active subscription and sufficient balance
  if (paymentMethod === 'wallet') {
    const activeSubscription = await Subscription.findOne({
      userId: authUser._id,
      status: 'active',
    });
    if (!activeSubscription) {
      return fail('No active subscription found. Please subscribe first.', 400);
    }

    if (user.walletBalance < totalAmount) {
      return fail(
        `Insufficient wallet balance. Need ৳${totalAmount}, Available: ৳${user.walletBalance}`,
        400
      );
    }

    user.walletBalance -= totalAmount;
    await user.save();
  }

  const order = await Order.create({
    userId: authUser._id,
    userName: user.fullName,
    phoneNumber: user.phoneNumber,
    package: packageName || (paymentMethod === 'wallet' ? 'Subscription' : 'Regular'),
    items,
    totalAmount,
    deliveryCharge: deliveryCharge || 0,
    paymentMethod: paymentMethod === 'wallet' ? 'wallet' : 'cash',
    paymentStatus: paymentMethod === 'wallet' ? 'paid' : 'pending',
    deliveryDate,
    deliveryTime,
    address: address || user.address,
    zone: zone || user.zone,
    specialInstructions,
  });

  return ok({ data: order, walletBalance: user.walletBalance }, 201);
});

// GET /api/orders — admin, with filters
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);

  const params = new URL(req.url).searchParams;
  const query: Record<string, unknown> = {};

  const status = params.get('status');
  const zone = params.get('zone');
  const paymentMethod = params.get('paymentMethod');
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');

  if (status) query.status = status;
  if (zone) query.zone = zone;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const orders = await Order.find(query).sort({ createdAt: -1 });
  return ok({ count: orders.length, data: orders });
});
