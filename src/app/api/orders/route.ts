import { requireAdmin, requireUser } from '@/server/auth';
import { checkDeliveryDeadline, isClosedFriday } from '@/server/deadlines';
import { body, fail, handler, ok } from '@/server/http';
import { GUEST_MEAL_MONTHLY_LIMIT, countGuestMeals } from '@/server/limits';
import BlockedDate from '@/server/models/BlockedDate';
import Order from '@/server/models/Order';
import Subscription from '@/server/models/Subscription';
import User from '@/server/models/User';
import { walletSummary } from '@/server/wallet';

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
    orderType,
  } = await body(req);

  /**
   * The order form has always sent this, and this handler has always dropped
   * it — every guest meal in the database is stored as `self` (the schema
   * default), which is why nothing could count them.
   */
  const isGuest = orderType === 'guest';

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

  // 4. Guest meals are capped per account per delivery month
  if (isGuest) {
    const used = await countGuestMeals(authUser._id, orderDate);
    if (used >= GUEST_MEAL_MONTHLY_LIMIT) {
      return fail(
        `এক মাসে সর্বোচ্চ ${GUEST_MEAL_MONTHLY_LIMIT}টি গেস্ট মিল অর্ডার করা যায়। এই মাসের সীমা শেষ হয়ে গেছে।`,
        400,
        { guestLimitReached: true, used, limit: GUEST_MEAL_MONTHLY_LIMIT }
      );
    }
  }

  // 4b. One order per meal per day for the customer themselves. A cancelled one
  //     does not count, so cancelling frees the slot again. Guest meals are
  //     separate orders by design and are not limited here.
  if (!isGuest) {
    const dayStart = new Date(deliveryDate);
    dayStart.setUTCHours(0, 0, 0, 0); // delivery dates are stored as midnight UTC
    const taken = await Order.exists({
      userId: authUser._id,
      deliveryTime,
      deliveryDate: { $gte: dayStart, $lt: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) },
      status: { $ne: 'cancelled' },
      orderType: { $ne: 'guest' },
      // Older guest orders were saved as `self`; they are recognisable by package.
      package: { $ne: 'Guest' },
    });
    if (taken) {
      return fail('এই দিনের এই বেলার খাবার আগেই অর্ডার করা আছে', 400, { alreadyOrdered: true });
    }
  }

  // 5. Wallet payments require an active subscription and enough *available*
  //    balance. Nothing is taken yet: the order reserves its price and is
  //    charged when it is delivered (src/server/wallet.ts).
  if (paymentMethod === 'wallet') {
    const activeSubscription = await Subscription.findOne({
      userId: authUser._id,
      status: 'active',
    });
    if (!activeSubscription) {
      return fail('No active subscription found. Please subscribe first.', 400);
    }

    const { available } = await walletSummary(authUser._id);
    if (available < totalAmount) {
      return fail(
        `ওয়ালেটে যথেষ্ট টাকা নেই। দরকার ৳${totalAmount}, অর্ডারের জন্য আছে ৳${Math.max(available, 0)}`,
        400
      );
    }
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
    // Paid when delivered, for wallet and cash alike.
    paymentStatus: 'pending',
    ...(paymentMethod === 'wallet' ? { walletCharged: false } : {}),
    deliveryDate,
    deliveryTime,
    address: address || user.address,
    zone: zone || user.zone,
    specialInstructions,
    orderType: isGuest ? 'guest' : 'self',
  });

  // A server still holding the Order schema from before `walletCharged`
  // existed (a dev server not restarted) drops the field without a word, and
  // the order would read as an old, already-paid one — never charged. Refuse
  // loudly instead of creating a free meal.
  if (paymentMethod === 'wallet' && order.walletCharged !== false) {
    await Order.deleteOne({ _id: order._id });
    return fail('Server is running an outdated Order model — restart it and try again', 500);
  }

  const wallet = await walletSummary(authUser._id);
  return ok({ data: order, walletBalance: wallet.balance, walletAvailable: wallet.available }, 201);
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
