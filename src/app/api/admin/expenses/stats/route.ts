import { requireAdmin } from '@/server/auth';
import { handler, ok } from '@/server/http';
import Expense, { type ExpenseCategory } from '@/server/models/Expense';

const EMPTY_BREAKDOWN: Record<ExpenseCategory, number> = {
  daily_bazar: 0,
  house_rent: 0,
  babuchi_khoros: 0,
  delivery_boy_salary: 0,
  others: 0,
};

// GET /api/admin/expenses/stats
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);

  const params = new URL(req.url).searchParams;
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');

  const dateFilter =
    startDate && endDate ? { date: { $gte: new Date(startDate), $lte: new Date(endDate) } } : {};

  const stats: { _id: ExpenseCategory; total: number; count: number }[] = await Expense.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  const categoryBreakdown = { ...EMPTY_BREAKDOWN };
  for (const stat of stats) {
    if (stat._id in categoryBreakdown) categoryBreakdown[stat._id] = stat.total;
  }

  return ok({
    data: {
      totalExpense: stats.reduce((sum, s) => sum + s.total, 0),
      categoryBreakdown,
      breakdown: stats,
    },
  });
});
