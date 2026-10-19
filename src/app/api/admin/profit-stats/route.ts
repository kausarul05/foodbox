import { requireAdmin } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Expense, { type ExpenseCategory } from '@/server/models/Expense';
import ManualOrder from '@/server/models/ManualOrder';
import Order from '@/server/models/Order';
import Subscription from '@/server/models/Subscription';
import Transaction from '@/server/models/Transaction';

/** Order payment methods that mean the customer pays in cash at the door. */
const COD_METHODS = new Set(['cash', 'cod']);

const EMPTY_BREAKDOWN: Record<ExpenseCategory, number> = {
  daily_bazar: 0,
  house_rent: 0,
  babuchi_khoros: 0,
  delivery_boy_salary: 0,
  others: 0,
};

// GET /api/admin/profit-stats — revenue (every delivered order + subscription
// fees), the delivery charges taken on cash orders, top-ups, expenses and profit
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);

  const params = new URL(req.url).searchParams;
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  const hasRange = Boolean(startDate && endDate);

  // Dates arrive as YYYY-MM-DD and both ends are inclusive.
  //
  // Orders count on their *delivery* date — the day the money came in — not the
  // day they were placed; a week ordered on Monday is spread over the week.
  // deliveryDate and Expense.date are stored as midnight UTC of the day, so the
  // range is in UTC. approvedAt is a real moment, so it is read in Dhaka time.
  const DAY = 24 * 60 * 60 * 1000;
  const dayRange = (zone: string) => ({
    $gte: new Date(`${startDate}T00:00:00${zone}`),
    $lt: new Date(new Date(`${endDate}T00:00:00${zone}`).getTime() + DAY),
  });

  const orderFilter = hasRange ? { deliveryDate: dayRange('Z') } : {};
  const expenseFilter = hasRange ? { date: dayRange('Z') } : {};
  // Subscription fees and top-ups count on the day an admin approved them.
  const approvedFilter = hasRange ? { approvedAt: dayRange('+06:00') } : {};

  /**
   * Everything the kitchen actually took on, cancelled orders aside.
   *
   * Fetched once and split in memory rather than queried twice: the delivered
   * rows below are a subset of these, so a second round trip would only re-read
   * what is already here. `returned` is kept — the food was cooked and sent, so
   * it is part of the order volume even though it never becomes revenue.
   */
  // `as const` keeps TypeScript from widening the literal to `string`, which
  // does not satisfy Mongoose's typed status filter.
  const liveFilter = { status: { $ne: 'cancelled' as const }, ...orderFilter };

  const [liveOrders, manualLiveOrders, expenses, paidSubscriptions, approvedRecharges] =
    await Promise.all([
      Order.find(liveFilter),
      ManualOrder.find(liveFilter),
      Expense.find(expenseFilter),
      // Fees are non-refundable, so a paid subscription counts even if it was cancelled later.
      Subscription.find({ paymentStatus: 'paid', ...approvedFilter }, { amount: 1 }),
      Transaction.find({ status: 'approved', ...approvedFilter }, { amount: 1 }),
    ]);

  const deliveredOrders = liveOrders.filter((o) => o.status === 'delivered');
  const manualDeliveredOrders = manualLiveOrders.filter((o) => o.status === 'delivered');

  const sumOrders = (orders: { totalAmount: number; deliveryCharge?: number }[]) =>
    orders.reduce((sum, o) => sum + o.totalAmount + (o.deliveryCharge || 0), 0);

  // Order revenue is every delivered order — wallet, cash on delivery and
  // manual — food price plus delivery charge. The cash-on-delivery figure is a
  // view *inside* it: just the delivery charges collected on cash orders.
  const codOrders = deliveredOrders.filter((o) => COD_METHODS.has(o.paymentMethod));
  const cashOnDelivery = codOrders.reduce((sum, o) => sum + (o.deliveryCharge || 0), 0);

  const orderRevenue = sumOrders(deliveredOrders) + sumOrders(manualDeliveredOrders);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const subscriptionFees = paidSubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);
  const customerRecharge = approvedRecharges.reduce((sum, t) => sum + (t.amount || 0), 0);

  /**
   * Revenue is delivered orders plus subscription fees.
   *
   * The fee is money the business keeps — it is non-refundable and buys no
   * food, so unlike a wallet top-up it is earned the moment it is approved.
   *
   * Top-ups stay out on purpose. That money is still the customer's until a
   * meal is delivered, and the delivered order already counts its own price
   * here; adding the top-up as well would count the same taka twice.
   */
  const totalRevenue = orderRevenue + subscriptionFees;

  /**
   * Every order placed, delivered or not — customer and admin manual alike.
   *
   * Sits outside revenue on purpose: an order only earns money once it is
   * delivered. The gap between this and `orderRevenue` is what is still in the
   * pipeline (or was returned).
   */
  const totalOrderAmount = sumOrders(liveOrders) + sumOrders(manualLiveOrders);

  const expenseBreakdown = { ...EMPTY_BREAKDOWN };
  for (const expense of expenses) {
    if (expense.category in expenseBreakdown) expenseBreakdown[expense.category] += expense.amount;
  }

  const profit = totalRevenue - totalExpense;

  return ok({
    data: {
      totalRevenue,
      orderRevenue,
      totalOrderAmount,
      cashOnDelivery,
      subscriptionFees,
      customerRecharge,
      totalExpense,
      profit,
      profitMargin: totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : 0,
      expenseBreakdown,
      counts: {
        cashOnDelivery: codOrders.length,
        subscriptions: paidSubscriptions.length,
        recharges: approvedRecharges.length,
      },
      // `ordersCount` is the delivered rows behind the revenue figure;
      // `allOrdersCount` is every non-cancelled one, behind totalOrderAmount.
      ordersCount: {
        regular: deliveredOrders.length,
        manual: manualDeliveredOrders.length,
        total: deliveredOrders.length + manualDeliveredOrders.length,
      },
      allOrdersCount: {
        regular: liveOrders.length,
        manual: manualLiveOrders.length,
        total: liveOrders.length + manualLiveOrders.length,
      },
    },
  });
});
