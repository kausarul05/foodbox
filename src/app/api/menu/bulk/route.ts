import { requireAdmin } from '@/server/auth';
import { body, handler, ok } from '@/server/http';
import WeeklyMenu from '@/server/models/WeeklyMenu';

interface BulkItem {
  id: string;
  morning: string;
  lunch: string;
  dinner: string;
}

// PUT /api/menu/bulk — admin
export const PUT = handler(async (req: Request) => {
  await requireAdmin(req);
  const { items = [] } = await body<{ items: BulkItem[] }>(req);

  const updated = await Promise.all(
    items.map(item =>
      WeeklyMenu.findByIdAndUpdate(
        item.id,
        { morning: item.morning, lunch: item.lunch, dinner: item.dinner },
        { new: true }
      )
    )
  );

  return ok({ data: updated });
});
