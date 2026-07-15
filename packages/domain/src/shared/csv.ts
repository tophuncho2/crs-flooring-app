// The CSV export standard. Pure string formatting over already-display-formatted
// typed rows — the single source of truth every export endpoint serializes
// through. RFC-4180 quoting, CRLF line ends, and an optional leading UTF-8 BOM
// so Excel decodes accented text and unicode signs (− →) correctly. No I/O,
// no framework — mirrors the money/phone standards.

/** One CSV column: a stable key (matches the client column-picker checkbox),
 * a header label, and a pure projection from a row to its cell string. */
export type ExportColumn<TRow> = {
  key: string
  label: string
  value: (row: TRow) => string
}

/**
 * One entry in a module's **column catalog** — the single source that drives BOTH
 * the visible list table and the export (checkboxes + CSV/Sheet). A plain entry
 * (no flag) appears in both; the two flags are the only way to "prop a column out"
 * of one surface for a specific reason:
 *   - `exportOnly` — in the export, NOT the table (e.g. raw cost/freight/unit cols).
 *   - `listOnly`   — in the table, NOT the export.
 * The client derives its `DataTableColumn`s from `!exportOnly` entries; the domain
 * derives its `ExportColumn` manifest from `!listOnly` entries via {@link toExportColumns}.
 */
export type ColumnCatalogEntry<TRow> = ExportColumn<TRow> & {
  exportOnly?: boolean
  listOnly?: boolean
}

/** Derive the export manifest from a column catalog: every non-`listOnly` entry, flags stripped. */
export function toExportColumns<TRow>(
  catalog: ReadonlyArray<ColumnCatalogEntry<TRow>>,
): ReadonlyArray<ExportColumn<TRow>> {
  return catalog
    .filter((entry) => !entry.listOnly)
    .map(({ key, label, value }) => ({ key, label, value }))
}

/** Row counts offered in the export panel; `"all"` resolves to {@link EXPORT_MAX_ROWS}. */
export const EXPORT_ROW_CAP_OPTIONS = [250, 500, 1000, "all"] as const
export type ExportRowCap = (typeof EXPORT_ROW_CAP_OPTIONS)[number]

/** Hard ceiling on rows any single export pulls, regardless of the requested cap. */
export const EXPORT_MAX_ROWS = 5000

/** Resolve a requested cap (`number` or `"all"`) to a concrete row count `≤ EXPORT_MAX_ROWS`. */
export function resolveExportRowCap(cap: ExportRowCap | number | undefined): number {
  if (cap === undefined || cap === "all") return EXPORT_MAX_ROWS
  const numeric = typeof cap === "number" ? cap : Number(cap)
  if (!Number.isFinite(numeric) || numeric <= 0) return EXPORT_MAX_ROWS
  return Math.min(Math.trunc(numeric), EXPORT_MAX_ROWS)
}

/**
 * Narrow a column manifest to the requested keys, preserving manifest order so
 * the CSV column order is stable regardless of how the client lists them. An
 * absent/empty key list means "all columns".
 */
export function pickExportColumns<TRow>(
  columns: ReadonlyArray<ExportColumn<TRow>>,
  keys: ReadonlyArray<string> | undefined,
): ReadonlyArray<ExportColumn<TRow>> {
  if (!keys || keys.length === 0) return columns
  const wanted = new Set(keys)
  return columns.filter((column) => wanted.has(column.key))
}

const NEEDS_QUOTING = /[",\r\n]/

function escapeField(value: string): string {
  return NEEDS_QUOTING.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Byte-order mark prefixed when `{ bom: true }` so Excel reads the file as UTF-8. */
const BOM = "﻿"

/**
 * Serialize `rows` to an RFC-4180 CSV string with the supplied `columns`
 * (header row from each `label`, cells from each `value`). Fields containing a
 * comma, double quote, CR, or LF are wrapped in double quotes with embedded
 * quotes doubled. Lines are CRLF-terminated. Pass `{ bom: true }` for a UTF-8 BOM.
 */
export function toCsv<TRow>(
  rows: ReadonlyArray<TRow>,
  columns: ReadonlyArray<ExportColumn<TRow>>,
  options?: { bom?: boolean },
): string {
  const header = columns.map((column) => escapeField(column.label)).join(",")
  const body = rows.map((row) =>
    columns.map((column) => escapeField(column.value(row))).join(","),
  )
  const lines = [header, ...body].join("\r\n")
  return options?.bom ? `${BOM}${lines}` : lines
}
