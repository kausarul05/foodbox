import { requireAdmin } from '@/server/auth';
import { fail, handler, ok, type RouteContext } from '@/server/http';
import Zone from '@/server/models/Zone';

// PUT /api/admin/zones/:id/toggle
export const PUT = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdmin(req);
  const { id } = await ctx.params;

  const zone = await Zone.findById(id);
  if (!zone) return fail('Zone not found', 404);

  zone.isActive = !zone.isActive;
  await zone.save();

  return ok({ data: zone });
});
