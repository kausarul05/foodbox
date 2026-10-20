import { requireAdmin } from '@/server/auth';
import { fail, handler, ok } from '@/server/http';
import { sheetUrl, sheetsConfigured, syncSheets } from '@/server/sheets';

/**
 * The Google Sheet mirror, by hand.
 *
 * Normally nothing calls this: every write goes through `handler()`, which
 * queues a sync on its own (src/server/http.ts). It exists for the three cases
 * that bypass that — the first run after the sheet is set up, anything changed
 * directly in the database, and the daily safety-net cron in vercel.json.
 *
 * GET  — is the mirror on, and where is the sheet (any admin; also the cron)
 * POST — sync now
 *
 * Unlike the .xlsx download this hands no customer data back to the caller, so
 * every admin role may use it; the data only ever goes to the sheet the owner
 * configured.
 */

// A sync reads every collection and makes four calls to Google.
export const maxDuration = 60;

/**
 * Vercel's cron sends `Authorization: Bearer $CRON_SECRET` and no admin token,
 * so it is checked before `requireAdmin` — which would reject the secret as a
 * malformed JWT. With CRON_SECRET unset there is no cron path in at all.
 */
function isCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export const GET = handler(async (req: Request) => {
  if (isCron(req)) {
    if (!sheetsConfigured()) return ok({ message: 'Google Sheets is not configured', data: { skipped: true } });
    const result = await syncSheets();
    console.log(`[sheets] cron sync: ${result.rows} rows in ${result.tookMs}ms`);
    return ok({ data: result });
  }

  await requireAdmin(req);
  return ok({ data: { configured: sheetsConfigured(), url: sheetUrl() } });
});

export const POST = handler(async (req: Request) => {
  await requireAdmin(req);

  if (!sheetsConfigured()) {
    return fail(
      'Google Sheets সেট করা হয়নি — GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL ও GOOGLE_SERVICE_ACCOUNT_KEY লাগবে',
      400
    );
  }

  const result = await syncSheets();
  return ok({ message: 'Google Sheet আপডেট হয়েছে', data: { ...result, url: sheetUrl() } });
});
