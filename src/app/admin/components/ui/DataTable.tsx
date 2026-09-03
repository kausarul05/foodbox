'use client';

import type { ReactNode } from 'react';

/**
 * One dataset, two presentations.
 *
 * A twelve-column admin table is unusable on a phone — it either overflows the
 * viewport or squeezes every cell to a few characters. Below `lg` each row is
 * rendered as a stacked card with its own labels; from `lg` up it is a normal
 * table. Both come from the same column definitions, so they cannot drift.
 */
export interface Column<T> {
  /** Column heading, and the field label on the phone card. */
  header: string;
  cell: (row: T) => ReactNode;
  /** Rendered as the card's headline instead of a labelled row. */
  primary?: boolean;
  /** Right-aligned in the table (amounts, action buttons). */
  align?: 'right';
  /** Dropped from the phone card to keep it short. */
  desktopOnly?: boolean;
}

export default function DataTable<T>({
  columns,
  rows,
  keyOf,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  empty: ReactNode;
}) {
  if (rows.length === 0) return <>{empty}</>;

  const primary = columns.find((c) => c.primary);
  const rest = columns.filter((c) => c !== primary);

  return (
    <>
      {/* Phone / tablet */}
      <ul className="space-y-3 lg:hidden">
        {rows.map((row) => (
          <li key={keyOf(row)} className="rounded-2xl border border-ink-200 bg-white p-4 shadow-card">
            {primary && <div className="mb-3 font-semibold text-ink-900">{primary.cell(row)}</div>}
            <dl className="space-y-2">
              {rest
                .filter((column) => !column.desktopOnly)
                .map((column) => (
                  <div key={column.header} className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-xs text-ink-500">{column.header}</dt>
                    <dd className="min-w-0 text-right text-sm text-ink-800">{column.cell(row)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>

      {/* Desktop */}
      <div className="hidden overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-card lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50">
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={`px-4 py-3 font-semibold whitespace-nowrap text-ink-600 ${
                    column.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((row) => (
              <tr key={keyOf(row)} className="transition-colors hover:bg-ink-50/60">
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={`px-4 py-3 align-middle text-ink-800 ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
