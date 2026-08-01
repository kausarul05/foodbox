import { fail, handler, ok, type RouteContext } from '@/server/http';
import Zone from '@/server/models/Zone';

// GET /api/zones/:id — public.
// The Express router had this route commented out even though the profile page
// called it, so every lookup 404'd. Implemented here.
export const GET = handler(async (_req: Request, ctx: RouteContext<{ id: string }>) => {
  const { id } = await ctx.params;
  const zone = await Zone.findById(id);
  if (!zone) return fail('জোন পাওয়া যায়নি', 404);
  return ok({ data: zone });
});
