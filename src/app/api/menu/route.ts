import { requireAdmin } from '@/server/auth';
import { body, handler, ok } from '@/server/http';
import WeeklyMenu from '@/server/models/WeeklyMenu';

// GET /api/menu — admin, every package
export const GET = handler(async (req: Request) => {
  await requireAdmin(req);
  const menu = await WeeklyMenu.find().sort({ package: 1, day: 1 });
  return ok({ count: menu.length, data: menu });
});

// POST /api/menu — admin
export const POST = handler(async (req: Request) => {
  await requireAdmin(req);
  const created = await WeeklyMenu.create(await body(req));
  return ok({ data: created }, 201);
});
