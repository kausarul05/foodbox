import { authorize, requireAdmin } from '@/server/auth';
import { handler } from '@/server/http';
import { buildBackupWorkbook } from '@/server/excelBackup';

/**
 * GET /api/admin/backup/excel — super_admin only
 *
 * Downloads the whole database as one .xlsx. This is the only route that hands
 * out every customer's phone number, address and wallet balance in a single
 * file, so it is restricted to super_admin rather than the manager/support
 * roles that may read individual pages.
 *
 * It answers with the file itself, not the usual `{ success, data }` envelope —
 * the browser needs the bytes and a content-disposition to save it. Errors
 * still come back as the envelope, because `handler()` formats those.
 */

// Reading every collection and zipping the workbook takes longer than the
// default 10s serverless limit allows once the order history grows.
export const maxDuration = 60;

export const GET = handler(async (req: Request) => {
  authorize(await requireAdmin(req), 'super_admin');

  const { buffer, fileName, counts } = await buildBackupWorkbook();
  const rows = Object.values(counts).reduce((sum, n) => sum + n, 0);
  console.log(`[backup] ${fileName} — ${rows} rows across ${Object.keys(counts).length} sheets`);

  return new Response(buffer, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${fileName}"`,
      'content-length': String(buffer.byteLength),
      // A backup must never come from a cache — it is only useful when it is
      // the data as it stands right now.
      'cache-control': 'no-store, must-revalidate',
    },
  });
});
