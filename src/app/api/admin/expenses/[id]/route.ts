import { requireAdmin } from '@/server/auth';
import { fail, handler, ok, type RouteContext } from '@/server/http';
import Expense from '@/server/models/Expense';

// DELETE /api/admin/expenses/:id
export const DELETE = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdmin(req);
  const { id } = await ctx.params;

  const result = await Expense.deleteOne({ _id: id });
  if (result.deletedCount === 0) return fail('Expense not found', 404);

  return ok({ message: 'Expense deleted' });
});
