import { requireAdmin } from '@/server/auth';
import { body, fail, handler, ok, type RouteContext } from '@/server/http';
import Zone from '@/server/models/Zone';

type Ctx = RouteContext<{ id: string }>;

// PUT /api/admin/zones/:id
export const PUT = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const { name, nameBn, deliveryCharge, isActive } = await body(req);

  const zone = await Zone.findById(id);
  if (!zone) return fail('Zone not found', 404);

  if (name) zone.name = String(name).toLowerCase().trim();
  if (nameBn !== undefined) zone.nameBn = nameBn;
  if (deliveryCharge !== undefined) zone.deliveryCharge = deliveryCharge;
  if (isActive !== undefined) zone.isActive = isActive;

  await zone.save();
  return ok({ data: zone });
});

// DELETE /api/admin/zones/:id
export const DELETE = handler(async (req: Request, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;

  const result = await Zone.deleteOne({ _id: id });
  if (result.deletedCount === 0) return fail('Zone not found', 404);

  return ok({ message: 'Zone deleted successfully' });
});
