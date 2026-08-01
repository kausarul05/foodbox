import { requireAdmin } from '@/server/auth';
import { body, handler, ok } from '@/server/http';
import Expense from '@/server/models/Expense';

// POST /api/admin/expenses
export const POST = handler(async (req: Request) => {
  const admin = await requireAdmin(req);
  const { category, categoryName, amount, description, date } = await body(req);

  const expense = await Expense.create({
    category,
    categoryName,
    amount,
    description,
    date: date || new Date(),
    addedBy: admin._id,
  });

  return ok({ data: expense }, 201);
});

// GET /api/admin/expenses
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);

  const params = new URL(req.url).searchParams;
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  const category = params.get('category');

  const query: Record<string, unknown> = {};
  if (startDate && endDate) query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  if (category) query.category = category;

  const expenses = await Expense.find(query).sort({ date: -1 });
  return ok({ count: expenses.length, data: expenses });
});
