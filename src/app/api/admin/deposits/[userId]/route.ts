import { authorize, requireAdmin } from '@/server/auth';
import { deductDeposit, holdDeposit, refundDeposit } from '@/server/deposit';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';

/**
 * POST /api/admin/deposits/:userId — super_admin | manager
 *
 * { action: 'hold' }                       box handed over (an existing subscriber)
 * { action: 'refund', reason? }            box returned fine — hold released
 * { action: 'deduct', reason, amount? }    box lost/broken — money taken, default ৳200
 *
 * All money rules live in src/server/deposit.ts.
 */
export const POST = handler(async (req: Request, ctx: RouteContext<{ userId: string }>) => {
  const admin = authorize(await requireAdmin(req), 'super_admin', 'manager');
  const { userId } = await ctx.params;
  if (!/^[a-f\d]{24}$/i.test(userId)) return fail('Invalid user id', 400);

  const { action, reason, amount } = await body<{ action?: string; reason?: string; amount?: number }>(req);
  const by = { id: admin._id, name: admin.fullName };

  const result =
    action === 'hold'
      ? await holdDeposit(userId, by, reason)
      : action === 'refund'
        ? await refundDeposit(userId, by, reason)
        : action === 'deduct'
          ? await deductDeposit(userId, by, String(reason ?? ''), amount === undefined ? undefined : Number(amount))
          : null;

  if (!result) return fail('Invalid action', 400);
  if (!result.ok) return fail(result.message, 400);
  return ok({ data: { amount: result.amount } });
});
