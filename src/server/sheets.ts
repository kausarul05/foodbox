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

const BRAND_HEADER = {
  backgroundColor: { red: 0.918, green: 0.345, blue: 0.047 },
  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
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

/**
 * The column widths from `backupData.ts` are in characters, the unit exceljs
 * uses; Sheets wants pixels. Runs of equal width are sent as one request, so a
 * 26-column tab costs a handful instead of 26.
 */
function widthRequests(sheetId: number, columns: { width: number }[]): unknown[] {
  const requests: unknown[] = [];
  let start = 0;
  for (let i = 1; i <= columns.length; i += 1) {
    if (i < columns.length && columns[i].width === columns[start].width) continue;
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: start, endIndex: i },
        properties: { pixelSize: Math.round(columns[start].width * 7) + 12 },
        fields: 'pixelSize',
      },
    });
    start = i;
  }
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

  const existing = await call<{ sheets?: { properties: SheetProperties }[] }>(
    config,
    '?fields=sheets(properties(sheetId,title,gridProperties))'
  );
  const byTitle = new Map((existing.sheets ?? []).map((s) => [s.properties.title, s.properties]));

  // One batchUpdate for every structural change: create the tabs that do not
  // exist, grow the ones too small to hold the data (writing outside a tab's
  // grid is an error, not an auto-expand), and paint the header row.
  const requests: unknown[] = [];
  // Tabs created by this sync, in the order their addSheet requests go out —
  // their sheetIds only exist in the response, so their widths follow after.
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
            gridProperties: { rowCount, columnCount, frozenRowCount: 1 },
          },
        },
      });
      created.push(source);
      continue;
    }

    const grid = current.gridProperties ?? {};
    if ((grid.rowCount ?? 0) < rowCount || (grid.columnCount ?? 0) < columnCount) {
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: current.sheetId,
            // Only ever grow: a smaller grid would delete the user's own notes
            // in columns beyond ours.
            gridProperties: {
              rowCount: Math.max(grid.rowCount ?? 0, rowCount),
              columnCount: Math.max(grid.columnCount ?? 0, columnCount),
              frozenRowCount: 1,
            },
          },
          fields: 'gridProperties.rowCount,gridProperties.columnCount,gridProperties.frozenRowCount',
        },
      });
    }

    requests.push({
      repeatCell: {
        range: { sheetId: current.sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: { userEnteredFormat: BRAND_HEADER },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    });
    requests.push(...widthRequests(current.sheetId, source.columns));
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
      newIds[index] === undefined ? [] : widthRequests(newIds[index], source.columns)
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
