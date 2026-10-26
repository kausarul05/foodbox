import { bn } from '@/lib/format';
import { isHandCash } from '@/lib/payment';
import { joiningMinimum, weekMealTotal } from '@/lib/rules';
import { baseUrlFrom, notifyAdminLater, subscriptionAlert } from '@/server/adminNotify';
import { requireAdmin, requireUser } from '@/server/auth';
import { body, fail, handler, ok } from '@/server/http';
import Package from '@/server/models/Package';
import Subscription from '@/server/models/Subscription';
import Transaction from '@/server/models/Transaction';
import User from '@/server/models/User';
import WeeklyMenu from '@/server/models/WeeklyMenu';

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
    amount,
  } = await body(req);

  // A subscription request is a claim that money was sent, so it has to carry
  // something the admin can check against their bKash/Nagad statement. Without
  // this the request arrived with nothing to verify. Hand cash is the one
  // exception: it is paid in person, and the admin approves once it is in hand.
  const cash = isHandCash(paymentMethod);
  if (!cash && (!transactionId || String(transactionId).trim().length < 6)) {
    return fail('ট্রানজেকশন আইডি দিন', 400);
  }

  const user = await User.findById(authUser._id);
  if (!user) return fail('User not found', 404);

  const packageData = await Package.findOne({ name: packageType });
  if (!packageData) return fail('Package not found', 404);

  /**
   * Joining is one payment: the fee, a week of meals, and the box deposit.
   *
   * Only the fee is earnings — the rest is credited to the customer's wallet
   * when an admin approves, which is why `amount` below stays the fee and the
   * float is kept apart. A customer who has already funded a wallet once is
   * not joining any more, so they owe the fee alone and may send more if they
   * want the top-up in the same payment.
   */
  const hasFunded = await Transaction.exists({ userId: authUser._id, status: 'approved' });
  const sent = Number(amount);
  let paidAmount = packageData.price;

  if (!hasFunded) {
    const menu = await WeeklyMenu.find(
      { package: packageType, isActive: true },
      { morning: 1, lunch: 1, dinner: 1, morningPrice: 1, lunchPrice: 1, dinnerPrice: 1 }
    );
    // Without a menu there is nothing to price a week of food against, and
    // nothing for the customer to order either.
    if (menu.length === 0) {
      return fail('এই প্যাকেজের সাপ্তাহিক মেনু এখনো যোগ করা হয়নি, তাই এখন সাবস্ক্রাইব করা যাচ্ছে না', 400);
    }
    const minimum = joiningMinimum(packageData.price, weekMealTotal(menu));
    if (!Number.isFinite(sent) || sent < minimum) {
      return fail(`প্রথমবার সাবস্ক্রাইব করতে সর্বনিম্ন ${bn(minimum)} টাকা পাঠাতে হবে`, 400, { minimum });
    }
    paidAmount = sent;
  } else if (Number.isFinite(sent) && sent > paidAmount) {
    paidAmount = sent;
  }

  const walletCredit = paidAmount - packageData.price;

  /**
   * Refuse rather than record a payment we could not store in full.
   *
   * Schemas are strict, so a write to a path the running model does not know
   * about is dropped with no error at all (see src/server/models/define.ts for
   * how a cached model goes stale). That is how a ৳1,930 joining payment was
   * once saved as a ৳90 fee: approving it would have credited the customer
   * nothing. A 503 the customer can retry is far better than a subscription
   * that cannot be honoured.
   */
  if (walletCredit > 0 && (!Subscription.schema.path('paidAmount') || !Subscription.schema.path('walletCredit'))) {
    console.error('[subscriptions] Subscription schema is missing paidAmount/walletCredit — refusing to store a partial joining payment');
    return fail('সার্ভারে সাময়িক সমস্যা হচ্ছে — একটু পরে আবার চেষ্টা করুন', 503);
  }

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
    paidAmount,
    walletCredit,
    // A re-request is a new payment, so an earlier credit must not block it.
    walletCreditedAt: undefined,
    startDate,
    endDate,
    paymentMethod,
    // Explicitly blank for cash, so a re-request does not keep an old id.
    transactionId: cash ? undefined : String(transactionId).trim(),
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

  // Built once for either branch below — the owner wants to hear about a
  // returning customer just as much as a brand-new one.
  const alert = (returning: boolean) =>
    notifyAdminLater(
      subscriptionAlert({
        userName: details.userName,
        phoneNumber: details.phoneNumber,
        email: details.email,
        packageName: details.packageName,
        amount: details.amount,
        paidAmount: details.paidAmount,
        walletCredit: details.walletCredit,
        paymentMethod,
        transactionId: details.transactionId,
        senderNumber: details.senderNumber,
        address: details.address,
        returning,
        baseUrl: baseUrlFrom(req),
      })
    );

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
    alert(true);
    return ok({ data: reopened });
  }

  const subscription = await Subscription.create({ userId: authUser._id, ...details });
  alert(false);
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
