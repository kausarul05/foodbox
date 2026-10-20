import { after } from 'next/server';
import jwt from 'jsonwebtoken';

import { DATE, collectBackup, type Table } from './backupData';

/**
 * Live mirror of the database into a Google Sheet.
 *
 * Every write that goes through `handler()` in src/server/http.ts queues a sync
 * once the response is already out, so a new order shows up in the owner's
 * sheet a second or two after the customer places it, with no button to press.
 * The sheet is the always-current copy; the .xlsx download is the point-in-time
 * one. Both are rendered from the same tables in `backupData.ts`.
 *
 * Three rules, all load-bearing:
 *
 * - **Unset env = the feature is off.** No `GOOGLE_SHEETS_ID` or no service
 *   account and `syncSheetsLater()` returns immediately, exactly as the routes
 *   behaved before it existed.
 * - **A sync failure must never fail or slow a request.** Syncs run inside
 *   `after()` (see `notifyAdminLater` in adminNotify.ts for why an unawaited
 *   promise is not an option on serverless) and every error is swallowed and
 *   logged.
 * - **Each tab is rewritten whole, not appended to.** Order statuses change,
 *   wallets go up and down, rows get cancelled. Patching individual rows means
 *   matching them by id on every write and drifting the first time a match
 *   fails; rewriting is one API call and is right by construction.
 *
 * A full sync is four HTTPS calls no matter how many tabs there are: read the
 * tab list, create/grow/format tabs, clear values, write values. A sync that
 * creates tabs makes one more — column widths need the sheetIds the create
 * call hands back — so only the first run after setup pays for it.
 */

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

/** Longest we wait on Google before giving up on a sync. */
const TIMEOUT_MS = 20000;

/**
 * The sheet's palette, taken from the app's own brand tokens so the mirror
 * looks like the admin panel rather than a raw export.
 */
const rgb = (red: number, green: number, blue: number) => ({ red, green, blue });
const BRAND = rgb(0.918, 0.345, 0.047); // brand-600, the header band
const WHITE = rgb(1, 1, 1);
const CREAM = rgb(0.996, 0.976, 0.957); // the alternating row
const SECTION_BG = rgb(0.996, 0.929, 0.859); // summary section headings
const SECTION_FG = rgb(0.486, 0.208, 0.047);
const INK = rgb(0.16, 0.14, 0.13);
const HAIRLINE = rgb(0.902, 0.878, 0.855);

/** Status words worth seeing at a glance, and the colour each one gets. */
const STATUS_COLOURS: { colour: { red: number; green: number; blue: number }; words: string[] }[] = [
  { colour: rgb(0.855, 0.937, 0.867), words: ['ডেলিভারি হয়েছে', 'চালু', 'অনুমোদিত', 'পরিশোধিত'] },
  { colour: rgb(0.992, 0.878, 0.878), words: ['বাতিল', 'ব্যর্থ', 'ফেরত এসেছে', 'কেটে নেওয়া'] },
  { colour: rgb(0.996, 0.945, 0.804), words: ['পেন্ডিং', 'রান্না হচ্ছে', 'ডেলিভারিতে', 'হোল্ড আছে'] },
];

const BRAND_HEADER = {
  backgroundColor: BRAND,
  textFormat: { bold: true, foregroundColor: WHITE },
  verticalAlignment: 'MIDDLE',
  wrapStrategy: 'CLIP',
};

export interface SheetsConfig {
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * The private key arrives as one line with literal `\n` in it — that is how
 * both Vercel's dashboard and a .env file carry a PEM — and often wrapped in
 * quotes. Both are undone here so the key parses.
 */
export function sheetsConfig(): SheetsConfig | null {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID?.trim();
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim();
  if (!spreadsheetId || !clientEmail || !rawKey) return null;

  const privateKey = rawKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
  return { spreadsheetId, clientEmail, privateKey };
}

export function sheetsConfigured(): boolean {
  return sheetsConfig() !== null;
}

/** The sheet's own URL, for the admin panel to link to. */
export function sheetUrl(): string | null {
  const config = sheetsConfig();
  return config ? `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit` : null;
}

/**
 * Access tokens last an hour, so they are cached on globalThis for the same
 * reason the database connection is: a serverless instance handles many
 * requests, and dev hot-reload re-evaluates the module.
 */
const cache = globalThis as unknown as { __sheetsToken?: { token: string; expires: number } };

async function accessToken(config: SheetsConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cache.__sheetsToken && cache.__sheetsToken.expires > now + 60) {
    return cache.__sheetsToken.token;
  }

  // The service-account flow: sign a JWT with the account's private key and
  // trade it for an access token. No user ever has to click "allow", which is
  // what makes this work from a server with nobody watching.
  const assertion = jwt.sign(
    { scope: SCOPE },
    config.privateKey,
    {
      algorithm: 'RS256',
      issuer: config.clientEmail,
      audience: TOKEN_URL,
      expiresIn: '1h',
    }
  );

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const data = (await response.json()) as { access_token?: string; error_description?: string; error?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(
      `Google refused the service account: ${data.error_description || data.error || response.status}`
    );
  }

  cache.__sheetsToken = { token: data.access_token, expires: now + 3000 };
  return data.access_token;
}

async function call<T>(config: SheetsConfig, path: string, init?: RequestInit): Promise<T> {
  const token = await accessToken(config);
  const response = await fetch(`${SHEETS_API}/${config.spreadsheetId}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...init?.headers,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text();
    // The two failures worth recognising on sight, because the fix differs.
    if (response.status === 403) {
      throw new Error(
        `403 from Google — share the sheet with ${config.clientEmail} as Editor. (${body.slice(0, 200)})`
      );
    }
    if (response.status === 404) {
      throw new Error(`404 from Google — GOOGLE_SHEETS_ID does not match any sheet. (${body.slice(0, 200)})`);
    }
    throw new Error(`Sheets API ${response.status}: ${body.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

/** `'অর্ডার'!A1` — a tab name in an A1 range, quoted, inner quotes doubled. */
function range(tab: string, suffix = ''): string {
  return `'${tab.replace(/'/g, "''")}'${suffix}`;
}

/**
 * A cell as Google Sheets should receive it.
 *
 * `valueInputOption: RAW` is used on purpose. With USER_ENTERED, Sheets parses
 * every string: `01868703130` becomes the number 1868703130 and loses its
 * leading zero, and a customer address starting with `=` becomes a formula.
 * RAW stores strings exactly as given, numbers as numbers.
 *
 * Dates are therefore written as `yyyy-mm-dd` text, which still sorts
 * chronologically and reads the same in every locale — unlike `dd/mm/yyyy`,
 * which a US-locale sheet would read month-first.
 */
function cell(value: unknown, fmt?: string): string | number {
  if (value instanceof Date) {
    const iso = value.toISOString();
    return fmt === DATE ? iso.slice(0, 10) : `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  return String(value ?? '');
}

interface SheetProperties {
  sheetId: number;
  title: string;
  gridProperties?: { rowCount?: number; columnCount?: number };
}

/** What a sync needs to know about a tab that already exists. */
interface SheetMetadata {
  properties: SheetProperties;
  bandedRanges?: { bandedRangeId: number }[];
  conditionalFormats?: unknown[];
  basicFilter?: unknown;
}

/**
 * Everything that makes one tab readable, as batchUpdate requests: column
 * widths and number formats, the brand header band, alternating rows, colours
 * on the status words and a filter row.
 *
 * Ranges are left open-ended wherever they can be, so none of this depends on
 * how many rows the tab happens to hold today — a sync that adds an order does
 * not have to repaint anything.
 */
function decorate(sheetId: number, source: Table): unknown[] {
  const requests: unknown[] = [];
  const columns = source.columns.length;
  const whole = { sheetId, startColumnIndex: 0, endColumnIndex: columns };
  // Banding, the filter and the colour rules stop at the last row rather than
  // running to the bottom of the grid, so empty rows stay plainly empty. They
  // are stripped and repainted on every sync, so the bound is always current.
  const filled = { ...whole, endRowIndex: source.rows.length + 1 };

  // Column widths. backupData counts characters, the unit exceljs uses; Sheets
  // wants pixels. Runs of equal width go out as one request, so a 26-column tab
  // costs a handful rather than 26.
  let start = 0;
  for (let i = 1; i <= columns; i += 1) {
    if (i < columns && source.columns[i].width === source.columns[start].width) continue;
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: start, endIndex: i },
        // Bengali glyphs are wider than the Latin ones exceljs sizes for, so a
        // header like "ওয়ালেট ব্যালেন্স" needs more room than its length suggests.
        properties: { pixelSize: Math.round(source.columns[start].width * 8) + 18 },
        fields: 'pixelSize',
      },
    });
    start = i;
  }

  // Clip rather than spill: a long address running across its neighbours is
  // what makes a wide sheet unreadable.
  requests.push({
    repeatCell: {
      range: { sheetId },
      cell: {
        userEnteredFormat: {
          // A table clips so columns stay aligned; the summary lets its notes
          // run on into the empty space beside them.
          wrapStrategy: source.plain ? 'OVERFLOW_CELL' : 'CLIP',
          verticalAlignment: 'MIDDLE',
          textFormat: { foregroundColor: INK, fontSize: 10 },
        },
      },
      fields: 'userEnteredFormat(wrapStrategy,verticalAlignment,textFormat(foregroundColor,fontSize))',
    },
  });

  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: { userEnteredFormat: BRAND_HEADER },
      fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy)',
    },
  });
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 30 },
      fields: 'pixelSize',
    },
  });

  // Money as money and dates as dates, per column. The cells still hold plain
  // numbers — only how they are printed changes, so sums keep working.
  source.columns.forEach((column, index) => {
    if (!column.fmt) return;
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, startColumnIndex: index, endColumnIndex: index + 1 },
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: column.fmt } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    });
  });

  // The summary stacks taka, counts and a percentage in one column, so its
  // formats are per row instead.
  (source.rowFormats ?? []).forEach((fmt, index) => {
    if (!fmt) return;
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: index + 1,
          endRowIndex: index + 2,
          startColumnIndex: 1,
          endColumnIndex: 2,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'NUMBER', pattern: fmt },
            horizontalAlignment: 'RIGHT',
          },
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
      },
    });
  });

  for (const index of source.sectionRows ?? []) {
    requests.push({
      repeatCell: {
        range: { ...whole, startRowIndex: index + 1, endRowIndex: index + 2 },
        cell: {
          userEnteredFormat: {
            backgroundColor: SECTION_BG,
            textFormat: { bold: true, fontSize: 11, foregroundColor: SECTION_FG },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    });
  }

  for (const index of source.accentRows ?? []) {
    requests.push({
      repeatCell: {
        range: { ...whole, startRowIndex: index + 1, endRowIndex: index + 2 },
        cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 11 } } },
        fields: 'userEnteredFormat.textFormat(bold,fontSize)',
      },
    });
  }

  if (source.plain) return requests;

  requests.push({
    addBanding: {
      bandedRange: {
        range: filled,
        rowProperties: { headerColor: BRAND, firstBandColor: WHITE, secondBandColor: CREAM },
      },
    },
  });
  requests.push({ setBasicFilter: { filter: { range: filled } } });

  if (source.rows.length === 0) return requests;

  /**
   * One rule per colour instead of one per word: a CUSTOM_FORMULA is written
   * against the top-left cell of its range and Sheets moves it over the rest,
   * so `=OR(A2="বাতিল",…)` tests each cell against the whole list.
   */
  for (const { colour, words } of STATUS_COLOURS) {
    const test = words.map((word) => `A2="${word}"`).join(',');
    requests.push({
      addConditionalFormatRule: {
        index: 0,
        rule: {
          ranges: [{ ...filled, startRowIndex: 1 }],
          booleanRule: {
            condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: `=OR(${test})` }] },
            format: { backgroundColor: colour, textFormat: { bold: true } },
          },
        },
      },
    });
  }

  requests.push({
    updateBorders: {
      range: { ...filled, startRowIndex: 1 },
      innerHorizontal: { style: 'SOLID', width: 1, color: HAIRLINE },
    },
  });

  return requests;
}

/**
 * Banding, colour rules and the filter cannot simply be re-added — a second
 * banding over the same cells is an error — so a tab that already has them is
 * stripped first, in the same batch, before `decorate` paints it again.
 */
function reset(sheet: SheetMetadata): unknown[] {
  const sheetId = sheet.properties.sheetId;
  const requests: unknown[] = [];
  // Rules are addressed by index, so they go from the back forwards.
  for (let i = (sheet.conditionalFormats ?? []).length - 1; i >= 0; i -= 1) {
    requests.push({ deleteConditionalFormatRule: { sheetId, index: i } });
  }
  for (const banded of sheet.bandedRanges ?? []) {
    requests.push({ deleteBanding: { bandedRangeId: banded.bandedRangeId } });
  }
  if (sheet.basicFilter) requests.push({ clearBasicFilter: { sheetId } });
  return requests;
}

export interface SyncResult {
  tabs: number;
  rows: number;
  tookMs: number;
}

/**
 * Rewrites every tab from the current database state. Throws on failure — the
 * manual route reports that; `syncSheetsLater` swallows it.
 */
export async function syncSheets(): Promise<SyncResult> {
  const config = sheetsConfig();
  if (!config) throw new Error('Google Sheets is not configured');

  const started = Date.now();
  const { tables } = await collectBackup();

  const existing = await call<{ sheets?: SheetMetadata[] }>(
    config,
    '?fields=sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)),' +
      'bandedRanges(bandedRangeId),conditionalFormats(ranges),basicFilter(range))'
  );
  const byTitle = new Map((existing.sheets ?? []).map((s) => [s.properties.title, s]));

  // One batchUpdate for every structural change: create the tabs that do not
  // exist, grow the ones too small to hold the data (writing outside a tab's
  // grid is an error, not an auto-expand), and paint all of them.
  const requests: unknown[] = [];
  // Tabs created by this sync, in the order their addSheet requests go out —
  // their sheetIds only exist in the response, so their painting follows after.
  const created: Table[] = [];
  for (const source of tables) {
    const rowCount = Math.max(source.rows.length + 1, 50);
    const columnCount = Math.max(source.columns.length, 1);
    const current = byTitle.get(source.name);

    if (!current) {
      requests.push({
        addSheet: {
          properties: {
            title: source.name,
            gridProperties: {
              rowCount,
              columnCount,
              frozenRowCount: 1,
              // The summary reads down the page; a wide table reads across it,
              // so its first column stays put while the rest scrolls.
              frozenColumnCount: source.plain ? 0 : 1,
            },
          },
        },
      });
      created.push(source);
      continue;
    }

    const grid = current.properties.gridProperties ?? {};
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: current.properties.sheetId,
          // Only ever grow: a smaller grid would delete anything the owner put
          // in columns beyond ours.
          gridProperties: {
            rowCount: Math.max(grid.rowCount ?? 0, rowCount),
            columnCount: Math.max(grid.columnCount ?? 0, columnCount),
            frozenRowCount: 1,
            frozenColumnCount: source.plain ? 0 : 1,
          },
        },
        fields:
          'gridProperties(rowCount,columnCount,frozenRowCount,frozenColumnCount)',
      },
    });

    requests.push(...reset(current), ...decorate(current.properties.sheetId, source));
  }

  if (requests.length > 0) {
    const batch = await call<{ replies?: { addSheet?: { properties: SheetProperties } }[] }>(
      config,
      ':batchUpdate',
      { method: 'POST', body: JSON.stringify({ requests }) }
    );

    // Only ever on a sync that created tabs — the first one, and later only
    // if a tab was deleted by hand. The steady state stays four calls.
    const newIds = (batch.replies ?? [])
      .map((reply) => reply.addSheet?.properties.sheetId)
      .filter((id): id is number => typeof id === 'number');
    const follow = created.flatMap((source, index) =>
      newIds[index] === undefined ? [] : decorate(newIds[index], source)
    );
    if (follow.length > 0) {
      await call(config, ':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: follow }) });
    }
  }

  /**
   * Clearing each tab by name — no cell range — empties the whole tab, which is
   * what makes a deleted or cancelled row disappear instead of lingering below
   * the rewritten rows. It clears values only; the header formatting stays.
   */
  await call(config, '/values:batchClear', {
    method: 'POST',
    body: JSON.stringify({ ranges: tables.map((t) => range(t.name)) }),
  });

  const data = tables.map((source) => ({
    range: range(source.name, '!A1'),
    values: [
      source.columns.map((column) => column.header),
      ...source.rows.map((row) => row.map((value, index) => cell(value, source.columns[index]?.fmt))),
    ],
  }));

  await call(config, '/values:batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'RAW', data }),
  });

  return {
    tabs: tables.length,
    rows: tables.reduce((sum, t) => sum + t.rows.length, 0),
    tookMs: Date.now() - started,
  };
}

/**
 * Queue a sync to run *after* the response has been sent.
 *
 * Call it from inside a request; it never throws and never blocks. When the
 * feature is off it does nothing at all, so the caller needs no condition.
 */
export function syncSheetsLater(trigger: string): void {
  if (!sheetsConfigured()) return;

  after(async () => {
    try {
      const result = await syncSheets();
      console.log(`[sheets] synced after ${trigger}: ${result.rows} rows, ${result.tookMs}ms`);
    } catch (error) {
      console.error('[sheets] sync failed after', trigger, error instanceof Error ? error.message : error);
    }
  });
}
