import ExcelJS from 'exceljs';

import { BD_OFFSET_MS, DATE, DATETIME, collectBackup, type Table } from './backupData';

/**
 * The whole database as one Excel workbook — the backup the owner downloads.
 *
 * All the deciding is in `backupData.ts`: which collections, which columns, what
 * each cell says. This file only renders those tables, so the .xlsx and the
 * Google Sheet mirror (`sheets.ts`) can never disagree about the data.
 */

const BRAND = 'FFEA580C';
const CREAM = 'FFFEF9F4';
const SECTION_BG = 'FFFEEDDB';
const SECTION_FG = 'FF7C350C';

/**
 * One sheet from one table, painted to match the live Google Sheet: brand
 * header band, frozen heading, alternating rows and a filter.
 */
function addSheet(wb: ExcelJS.Workbook, source: Table) {
  // A wide table also freezes its first column, so the name stays in view.
  const ySplit = 1;
  const xSplit = source.plain ? 0 : 1;
  const ws = wb.addWorksheet(source.name, { views: [{ state: 'frozen', xSplit, ySplit }] });

  ws.columns = source.columns.map((column, index) => ({
    header: column.header,
    key: `c${index}`,
    width: column.width,
    style: column.fmt ? { numFmt: column.fmt } : undefined,
  }));

  const sections = new Set(source.sectionRows ?? []);
  const accents = new Set(source.accentRows ?? []);

  source.rows.forEach((row, index) => {
    const added = ws.addRow(row);

    // A date in a column that is not formatted as one — the summary's single
    // timestamp — would otherwise render as Excel's raw day number.
    const rowFormat = source.rowFormats?.[index];
    row.forEach((value, column) => {
      const fmt = source.columns[column]?.fmt ?? (column === 1 ? rowFormat : undefined);
      const cell = added.getCell(column + 1);
      if (value instanceof Date) {
        if (fmt !== DATE && fmt !== DATETIME) cell.numFmt = DATETIME;
      } else if (fmt && !source.columns[column]?.fmt) {
        cell.numFmt = fmt;
        cell.alignment = { horizontal: 'right' };
      }
    });

    if (sections.has(index)) {
      added.font = { bold: true, size: 11, color: { argb: SECTION_FG } };
      added.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SECTION_BG } };
    } else if (accents.has(index)) {
      added.font = { bold: true, size: 11 };
    } else if (!source.plain && index % 2 === 1) {
      added.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREAM } };
    }
  });

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;

  if (source.rows.length > 0 && !source.plain) {
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
