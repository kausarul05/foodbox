import { requireAdmin } from '@/server/auth';
import { body, handler, ok } from '@/server/http';
import Package from '@/server/models/Package';

// GET /api/packages — public, active packages only
export const GET = handler(async () => {
  const packages = await Package.find({ isActive: true });
  return ok({ count: packages.length, data: packages });
});

// POST /api/packages — admin
export const POST = handler(async (req: Request) => {
  await requireAdmin(req);
  const created = await Package.create(await body(req));
  return ok({ data: created }, 201);
});
