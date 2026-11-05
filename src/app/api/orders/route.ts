import { bn } from '@/lib/format';
import { mealPrice } from '@/lib/rules';
import { requireAdmin, requireUser } from '@/server/auth';
import { checkDeliveryDeadline, isClosedFriday } from '@/server/deadlines';
import { body, fail, handler, ok } from '@/server/http';
import { GUEST_DAYS_MONTHLY_LIMIT, GUEST_MEAL_MONTHLY_LIMIT, countGuestMeals } from '@/server/limits';
import BlockedDate from '@/server/models/BlockedDate';
import Order from '@/server/models/Order';
import Package from '@/server/models/Package';
import Subscription from '@/server/models/Subscription';
import User from '@/server/models/User';
import WeeklyMenu, { MENU_DAYS } from '@/server/models/WeeklyMenu';
import Zone from '@/server/models/Zone';
import { walletSummary } from '@/server/wallet';

/**
 * getUTCDay() is Sunday-first, and a delivery date is a calendar date stored as
 * midnight UTC — reading it with local getters moves the day for any server
 * west of UTC, which would price Saturday's menu against Friday's.
 */
const MENU_DAY_BY_UTC_INDEX: (typeof MENU_DAYS)[number][] = [
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
  'শনিবার',
];

type MealKey = 'morning' | 'lunch' | 'dinner';
const MEAL_KEYS = new Set<MealKey>(['morning', 'lunch', 'dinner']);

// POST /api/orders — user
export const POST = handler(async (req: Request) => {
  const authUser = await requireUser(req);
  const {
    paymentMethod,
    deliveryDate,
    deliveryTime,
    address,
    zone,
    specialInstructions,
    package: packageName,
    packageSlug,
    orderType,
  } = await body(req);

  /**
   * `items`, `totalAmount` and `deliveryCharge` are deliberately **not** read
   * from the request. They used to be, and were written to the order as sent:
   * anyone who could edit the request could order a ৳70 dinner for ৳1, and a
   * wallet order would then reserve and charge that ৳1. Everything chargeable
   * is looked up below — the dish and its price from the weekly menu, the
   * delivery charge from the zone. The form still sends them; they are ignored.
   */

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
    return fail('প্রতি মাসের 2য় ও লাস্ট শুক্রবার মিল বন্ধ থাকে। আগামীকাল অর্ডার করুন।', 400, {
      isFridayClosed: true,
    });
  }

  // 3. Ordering cut-off
  const deadline = checkDeliveryDeadline(orderDate, deliveryTime);
  if (!deadline.isWithinDeadline) return fail(deadline.message, 400);

  // 4. Guest meals are capped per account per delivery month: 21 meals, 7 days
  if (isGuest) {
    const { meals, days } = await countGuestMeals(authUser._id, orderDate);
    if (meals >= GUEST_MEAL_MONTHLY_LIMIT) {
      return fail(
        `এক মাসে সর্বোচ্চ ${bn(GUEST_MEAL_MONTHLY_LIMIT)}টি গেস্ট মিল অর্ডার করা যায়। এই মাসের সীমা শেষ হয়ে গেছে।`,
        400,
        { guestLimitReached: true, used: meals, limit: GUEST_MEAL_MONTHLY_LIMIT }
      );
    }
    const day = orderDate.toISOString().slice(0, 10);
    if (!days.includes(day) && days.length >= GUEST_DAYS_MONTHLY_LIMIT) {
      return fail(
        `এক মাসে সর্বোচ্চ ${bn(GUEST_DAYS_MONTHLY_LIMIT)} দিন গেস্ট মিল নেওয়া যায়। এই মাসের ${bn(GUEST_DAYS_MONTHLY_LIMIT)} দিন শেষ হয়ে গেছে।`,
        400,
        { guestLimitReached: true, usedDays: days.length, daysLimit: GUEST_DAYS_MONTHLY_LIMIT }
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

  /* ------------------------------------------------------------------ *
   * 5. What this meal costs — read from the menu, never from the request.
   * ------------------------------------------------------------------ */

  const activeSubscription = await Subscription.findOne({
    userId: authUser._id,
    status: 'active',
  });

  if (!MEAL_KEYS.has(deliveryTime as MealKey)) return fail('কোন বেলার খাবার তা দিন', 400);
  const meal = deliveryTime as MealKey;

  /**
   * Which menu to price against.
   *
   * A subscriber's is decided by what they pay for, so the request does not get
   * a say. Everyone else picks on the form and sends the slug, which only
   * selects a public menu — the price still comes from that menu, so there is
   * nothing to gain by lying about it. It is checked against a live package all
   * the same, or a typo would silently price nothing.
   */
  let menuPackage: string | undefined = activeSubscription?.package;
  if (!menuPackage) {
    const chosen = typeof packageSlug === 'string' ? packageSlug.trim() : '';
    const exists = chosen ? await Package.findOne({ name: chosen, isActive: true }) : null;
    if (!exists) return fail('কোন প্যাকেজের মেন্যু থেকে নিচ্ছেন সেটা বেছে নিন', 400);
    menuPackage = chosen;
  }

  const menuDay = MENU_DAY_BY_UTC_INDEX[orderDate.getUTCDay()];
  const menuRow = await WeeklyMenu.findOne({ package: menuPackage, day: menuDay, isActive: true });

  const itemName = menuRow?.[meal];
  const menuPrice = menuRow?.[`${meal}Price`] ?? 0;
  // A dish with no name is not on the menu that day. A dish with no price is
  // not priced yet, and letting it through would hand out a free meal.
  if (!itemName) return fail('এই দিনে এই বেলার খাবার মেন্যুতে নেই', 400);
  if (!(menuPrice > 0)) return fail('এই খাবারের দাম এখনো ঠিক করা হয়নি — একটু পরে চেষ্টা করুন', 400);

  const pay = paymentMethod === 'wallet' ? 'wallet' : 'cash';
  const totalAmount = mealPrice(menuPrice, pay);
  const items = [{ name: itemName, price: totalAmount, quantity: 1 }];

  /**
   * Delivery is free for a subscriber's own meals and charged on everything
   * else — a guest meal included, even when the host subscribes. The rate is
   * the zone's, read here rather than taken from the request for the same
   * reason as the price.
   */
  const zoneId = zone || user.zone;
  const freeDelivery = Boolean(activeSubscription) && !isGuest;
  const zoneDoc = zoneId ? await Zone.findById(zoneId).catch(() => null) : null;
  // Delivery is never free by accident. If the zone cannot be read, refuse
  // rather than record a 0 charge the customer was never quoted — the form
  // shows a fallback rate, and the two must not drift apart silently.
  if (!freeDelivery && !zoneDoc) return fail('ডেলিভারির জোন বেছে নিন', 400);
  const deliveryCharge = freeDelivery ? 0 : (zoneDoc?.deliveryCharge ?? 0);

  // 6. Wallet payments require an active subscription and enough *available*
  //    balance. Nothing is taken yet: the order reserves its price and is
  //    charged when it is delivered (src/server/wallet.ts).
  if (paymentMethod === 'wallet') {
    if (!activeSubscription) {
      return fail('No active subscription found. Please subscribe first.', 400);
    }

    const { available, deposit } = await walletSummary(authUser._id);
    if (available < totalAmount) {
      if (deposit.due > 0) {
        return fail(
          `খাবারের বক্সের সিকিউরিটি ডিপোজিট ৳${deposit.required} এখনো পুরো হয়নি (বাকি ৳${deposit.due})। আগে রিচার্জ করুন।`,
          400
        );
      }
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
    deliveryCharge,
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
