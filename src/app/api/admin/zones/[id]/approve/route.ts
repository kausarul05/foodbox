import { requireAdmin } from '@/server/auth';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import Zone from '@/server/models/Zone';

// PUT /api/admin/zones/:id/approve — activates a user-submitted zone
export const PUT = handler(async (req: Request, ctx: RouteContext<{ id: string }>) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const { deliveryCharge } = await body(req);

  const zone = await Zone.findById(id);
  if (!zone) return fail('Zone not found', 404);

  zone.isActive = true;
  if (deliveryCharge) zone.deliveryCharge = deliveryCharge;
  await zone.save();

  return ok({ data: zone, message: 'জোন অনুমোদন করা হয়েছে' });
});
