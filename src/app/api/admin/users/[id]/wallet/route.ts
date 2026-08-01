import { authorize, requireAdmin } from '@/server/auth';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import User from '@/server/models/User';

// PUT /api/admin/users/:id/wallet — super_admin | manager
export const PUT = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  authorize(await requireAdmin(req), 'super_admin', 'manager');
  const { id } = await ctx.params;
  const { amount, action } = await body<{ amount: number; action: 'add' | 'deduct' }>(req);

  const user = await User.findById(id);
  if (!user) return fail('User not found', 404);

  if (action === 'add') {
    user.walletBalance += amount;
  } else if (action === 'deduct') {
    if (user.walletBalance < amount) return fail('Insufficient balance', 400);
    user.walletBalance -= amount;
  }

  await user.save();
  return ok({ data: { walletBalance: user.walletBalance } });
});
