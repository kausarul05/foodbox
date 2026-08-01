import { requireAdmin } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Expense, { type ExpenseCategory } from '@/server/models/Expense';
import ManualOrder from '@/server/models/ManualOrder';
import Order from '@/server/models/Order';

const EMPTY_BREAKDOWN: Record<ExpenseCategory, number> = {
  daily_bazar: 0,
  house_rent: 0,
  babuchi_khoros: 0,
  delivery_boy_salary: 0,
  others: 0,
};

// GET /api/admin/profit-stats — revenue from delivered orders minus expenses
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);

  const params = new URL(req.url).searchParams;
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  const hasRange = Boolean(startDate && endDate);

  const orderFilter = hasRange
    ? { createdAt: { $gte: new Date(startDate!), $lte: new Date(endDate!) } }
    : {};
  const expenseFilter = hasRange
    ? { date: { $gte: new Date(startDate!), $lte: new Date(endDate!) } }
    : {};

  const [deliveredOrders, manualDeliveredOrders, expenses] = await Promise.all([
    Order.find({ status: 'delivered', ...orderFilter }),
    ManualOrder.find({ status: 'delivered', ...orderFilter }),
    Expense.find(expenseFilter),
  ]);

  const sumOrders = (orders: { totalAmount: number; deliveryCharge?: number }[]) =>
    orders.reduce((sum, o) => sum + o.totalAmount + (o.deliveryCharge || 0), 0);

  const totalRevenue = sumOrders(deliveredOrders) + sumOrders(manualDeliveredOrders);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const expenseBreakdown = { ...EMPTY_BREAKDOWN };
  for (const expense of expenses) {
    if (expense.category in expenseBreakdown) expenseBreakdown[expense.category] += expense.amount;
  }

  const profit = totalRevenue - totalExpense;

  return ok({
    data: {
      totalRevenue,
      totalExpense,
      profit,
      profitMargin: totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : 0,
      expenseBreakdown,
      ordersCount: {
        regular: deliveredOrders.length,
        manual: manualDeliveredOrders.length,
        total: deliveredOrders.length + manualDeliveredOrders.length,
      },
    },
  });
});
