import { requireAdmin } from '@/server/auth';
import { body, handler, ok } from '@/server/http';
import Package from '@/server/models/Package';

// GET /api/packages — public, active packages only
export const GET = handler(async () => {
  /**
   * Cheapest first.
   *
   * Unsorted, these came back in insertion order, so whichever package the
   * owner happened to create first led the weekly-menu tabs and the package
   * cards — standard before basic. Every caller shows them in the order they
   * arrive, and the menu opens on the first one, so that decided what a
   * visitor meets. Price is the order a reader expects and it maintains
   * itself: a new package lands where its price puts it, with no code change.
   * createdAt breaks a tie so two equally priced packages keep a stable order.
   */
  const packages = await Package.find({ isActive: true }).sort({ price: 1, createdAt: 1 });
  return ok({ count: packages.length, data: packages });
});

// POST /api/packages — admin
export const POST = handler(async (req: Request) => {
  await requireAdmin(req);
  const created = await Package.create(await body(req));
  return ok({ data: created }, 201);
});
