import { requireAdmin } from '@/server/auth';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import Package from '@/server/models/Package';

type Ctx = RouteContext<{ id: string }>;

// GET /api/packages/:id — public
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const found = await Package.findById(id);
  if (!found) return fail('Package not found', 404);
  return ok({ data: found });
});

// PUT /api/packages/:id — admin
export const PUT = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;

  const updated = await Package.findByIdAndUpdate(id, await body(req), {
    new: true,
    runValidators: true,
  });
  if (!updated) return fail('Package not found', 404);

  return ok({ data: updated });
});

// DELETE /api/packages/:id — admin
export const DELETE = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;

  const result = await Package.deleteOne({ _id: id });
  if (result.deletedCount === 0) return fail('Package not found', 404);

  return ok({ message: 'Package removed successfully' });
});
