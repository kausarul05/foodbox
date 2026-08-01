import { handler, ok, type RouteContext } from '@/server/http';
import WeeklyMenu from '@/server/models/WeeklyMenu';

// GET /api/menu/package/:package — public
export const GET = handler(async (_req: Request, ctx: RouteContext<{ package: string }>) => {
  const { package: packageType } = await ctx.params;
  const menu = await WeeklyMenu.find({ package: packageType, isActive: true }).sort({ day: 1 });
  return ok({ count: menu.length, data: menu });
});
