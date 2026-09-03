import { handler, ok } from '@/server/http';
import Order from '@/server/models/Order';
import Package from '@/server/models/Package';
import WeeklyMenu from '@/server/models/WeeklyMenu';
import Zone from '@/server/models/Zone';

/**
 * GET /api/stats/public — real counts for the marketing copy on the home page.
 *
 * Public and deliberately count-only: no user, order or revenue detail leaves
 * this route. It exists so the landing page can stop shipping invented numbers.
 */
export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const [zones, meals, packages, delivered] = await Promise.all([
    Zone.countDocuments({ isActive: true }),
    WeeklyMenu.countDocuments({ isActive: true }),
    Package.countDocuments({ isActive: true }),
    Order.countDocuments({ status: 'delivered' }),
  ]);

  return ok({ data: { zones, meals, packages, delivered } });
});
