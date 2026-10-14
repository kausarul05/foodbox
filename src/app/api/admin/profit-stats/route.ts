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

// GET /api/admin/profit-stats — revenue (every delivered order), the delivery
// charges taken on cash orders, subscription fees, top-ups, expenses and profit
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

  const [deliveredOrders, manualDeliveredOrders, expenses, paidSubscriptions, approvedRecharges] =
    await Promise.all([
      Order.find({ status: 'delivered', ...orderFilter }),
      ManualOrder.find({ status: 'delivered', ...orderFilter }),
      Expense.find(expenseFilter),
      // Fees are non-refundable, so a paid subscription counts even if it was cancelled later.
      Subscription.find({ paymentStatus: 'paid', ...approvedFilter }, { amount: 1 }),
      Transaction.find({ status: 'approved', ...approvedFilter }, { amount: 1 }),
    ]);

  const sumOrders = (orders: { totalAmount: number; deliveryCharge?: number }[]) =>
    orders.reduce((sum, o) => sum + o.totalAmount + (o.deliveryCharge || 0), 0);

  // Revenue is every delivered order — wallet, cash on delivery and manual —
  // food price plus delivery charge. The cash-on-delivery box is an extra view:
  // just the delivery charges collected on cash orders.
  const codOrders = deliveredOrders.filter((o) => COD_METHODS.has(o.paymentMethod));
  const cashOnDelivery = codOrders.reduce((sum, o) => sum + (o.deliveryCharge || 0), 0);

  const totalRevenue = sumOrders(deliveredOrders) + sumOrders(manualDeliveredOrders);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const subscriptionFees = paidSubscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);
  const customerRecharge = approvedRecharges.reduce((sum, t) => sum + (t.amount || 0), 0);

  const expenseBreakdown = { ...EMPTY_BREAKDOWN };
  for (const expense of expenses) {
    if (expense.category in expenseBreakdown) expenseBreakdown[expense.category] += expense.amount;
  }

  // Subscription fees and top-ups are not in revenue or profit.
  const profit = totalRevenue - totalExpense;

  return ok({
    data: {
      totalRevenue,
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
      ordersCount: {
        regular: deliveredOrders.length,
        manual: manualDeliveredOrders.length,
        total: deliveredOrders.length + manualDeliveredOrders.length,
      },
    },
  });
});
