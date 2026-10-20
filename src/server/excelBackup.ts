import ExcelJS from 'exceljs';

import { BD_OFFSET_MS, DATETIME, collectBackup, type Table } from './backupData';

/**
 * The whole database as one Excel workbook — the backup the owner downloads.
 *
 * All the deciding is in `backupData.ts`: which collections, which columns, what
 * each cell says. This file only renders those tables, so the .xlsx and the
 * Google Sheet mirror (`sheets.ts`) can never disagree about the data.
 */

const BRAND = 'FFEA580C';

/**
 * One sheet from one table. Header row frozen and filterable, so a 5,000-row
 * order sheet is still usable.
 */
function addSheet(wb: ExcelJS.Workbook, source: Table) {
  const ws = wb.addWorksheet(source.name, { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = source.columns.map((column, index) => ({
    header: column.header,
    key: `c${index}`,
    width: column.width,
    style: column.fmt ? { numFmt: column.fmt } : undefined,
  }));

  for (const row of source.rows) {
    const added = ws.addRow(row);
    // A date in a column that is not formatted as one — the summary's single
    // timestamp — would otherwise render as Excel's raw day number.
    row.forEach((value, index) => {
      if (value instanceof Date && !source.columns[index]?.fmt) {
        added.getCell(index + 1).numFmt = DATETIME;
      }
    });
  }

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;

  if (source.rows.length > 0) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: source.columns.length } };
  }

  return ws;
}

export interface BackupResult {
  /** The .xlsx file itself, ready to hand to a Response. */
  buffer: ArrayBuffer;
  fileName: string;
  /** Row count per sheet — handy for the log line and the API response. */
  counts: Record<string, number>;
}

/** `foodbox-backup-2026-10-20-1830.xlsx`, stamped in Dhaka time. */
export function backupFileName(now = new Date()): string {
  const bd = new Date(now.getTime() + BD_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${bd.getUTCFullYear()}-${pad(bd.getUTCMonth() + 1)}-${pad(bd.getUTCDate())}` +
    `-${pad(bd.getUTCHours())}${pad(bd.getUTCMinutes())}`;
  return `foodbox-backup-${stamp}.xlsx`;
}

export async function buildBackupWorkbook(): Promise<BackupResult> {
  const { takenAt, counts, tables } = await collectBackup();

  const wb = new ExcelJS.Workbook();
  wb.creator = 'FoodBox';
  wb.created = takenAt;
  for (const source of tables) addSheet(wb, source);

  /**
   * `writeBuffer()` is typed loosely and returns a Node Buffer at runtime,
   * whose `.buffer` is a shared pool that may be far larger than the file.
   * Copying the exact bytes into a fresh ArrayBuffer is what makes this safe
   * to pass straight to a Response.
   */
  const written = (await wb.xlsx.writeBuffer()) as unknown;
  const bytes = written instanceof Uint8Array ? written : new Uint8Array(written as ArrayBuffer);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);

  return { buffer, fileName: backupFileName(takenAt), counts };
}
