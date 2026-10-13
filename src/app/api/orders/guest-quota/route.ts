import { requireUser } from '@/server/auth';
import { handler, ok } from '@/server/http';
import { guestMealQuota } from '@/server/limits';

/**
 * GET /api/orders/guest-quota?month=YYYY-MM — user
 *
 * How many guest meals this account has left for the month. The order form
 * reads it so the customer sees the remaining count before picking dates
 * rather than finding out halfway through placing them.
 */
export const GET = handler(async (req: Request) => {
  const authUser = await requireUser(req);

  const month = new URL(req.url).searchParams.get('month');
  // `new Date('2026-10')` is parsed as UTC midnight, which is still September in
  // the western hemisphere — building it from the parts keeps it local.
  let date = new Date();
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, m] = month.split('-').map(Number);
    date = new Date(year, m - 1, 1);
  }

  return ok({ data: await guestMealQuota(authUser._id, date) });
});
