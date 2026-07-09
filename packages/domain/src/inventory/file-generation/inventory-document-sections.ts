import type { EnrichedInventoryAdjustmentRow } from "../adjustments/types.js"
import type { InventoryRow } from "../types.js"
import {
  INVENTORY_PRINT_ADJUSTMENT_COLUMNS,
  INVENTORY_PRINT_FIELD_COLUMNS,
  type AdjustmentColumnVisibility,
  type InventoryColumnVisibility,
} from "./types.js"

/**
 * Shared section renderers + style block for the on-demand inventory PRINT VIEWS.
 * Mirrors `work-order-document-sections.ts`: a header that repeats per page, a
 * label/value block for the single inventory record, and a flat adjustments table.
 * The configurator drives these with a per-document config (which inventory fields,
 * which adjustment columns, which adjustment rows).
 *
 * Style-block notes (identical rationale to the work-order block):
 *   - Every selector is scoped under `.inv-print-root` so Tailwind's preflight
 *     reset cannot flatten bare table/h2.
 *   - `@page { margin: 0 }` with the inset moved onto padding means the browser
 *     injects no default header/footer (date / URL / page #).
 */

// Right-aligned adjustment columns (numeric-ish). Everything else left-aligns.
const NUMERIC_ADJUSTMENT_KEYS = new Set<string>(["quantity", "adjustment"])

export const INV_PRINT_STYLE_BLOCK = `
  @page { size: letter; margin: 0; }
  .inv-print-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #111; font-size: 12px; padding: 0 0.25in 0.25in 0.25in; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .inv-print-root h2 { font-size: 14px; margin: 18px 0 6px 0; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  .inv-print-root table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  .inv-print-root .inv-primary-table { table-layout: fixed; border-bottom: 1px solid #ddd; }
  .inv-print-root .inv-primary-table th, .inv-print-root .inv-primary-table td { border: 0; padding: 3px 8px; text-align: left; vertical-align: top; overflow-wrap: break-word; }
  .inv-print-root .inv-primary-table th { font-weight: 600; white-space: nowrap; padding-right: 16px; width: 22%; }
  .inv-print-root .inv-primary-table td.multiline { white-space: pre-wrap; }
  .inv-print-root .flat-rows { width: 100%; border-collapse: collapse; table-layout: auto; margin: 12px 0 0 0; }
  .inv-print-root .flat-rows th, .inv-print-root .flat-rows td { border: 0; padding: 3px 6px; font-size: 13px; text-align: left; vertical-align: top; white-space: nowrap; }
  .inv-print-root .flat-rows th { font-weight: 600; border-bottom: 1px solid #111; padding-bottom: 2px; }
  .inv-print-root .flat-rows tbody tr:nth-child(even) { background: #f0f0f0; }
  .inv-print-root .flat-rows .cl-num { text-align: right; }
  .inv-print-root .page-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; margin: 0 0 14px 0; }
  .inv-print-root .page-header > span { font-size: 16px; font-weight: 600; }
  .inv-print-root .page-brand { justify-self: start; }
  .inv-print-root .page-logo { justify-self: start; height: 56px; width: auto; }
  .inv-print-root .page-tag { justify-self: center; }
  .inv-print-root .page-number { justify-self: end; }
  .inv-print-root .empty-cell { color: #666; }
  .inv-print-root .page-frame { margin: 0; table-layout: fixed; }
  .inv-print-root .page-frame > thead { display: table-header-group; }
  .inv-print-root .page-frame > thead > tr > td { border: 0; padding: 0.5in 0 0 0; }
  .inv-print-root .page-frame > tbody > tr > td { border: 0; padding: 0; }
`

/**
 * Shared header (.page-header grid): "CRS Floor Covering" (or the brand logo) on
 * the left, the document-type `tag` centered, and the inventory number mirrored to
 * the right. The `tag` is the configurable top-center document label.
 */
export function renderInventoryDocumentHeader(
  inventory: { inventoryNumber: string },
  tag: string,
  logoUrl?: string | null,
): string {
  const brand = logoUrl
    ? `<img class="page-logo" src="${escapeHtml(logoUrl)}" alt="CRS Floor Covering" />`
    : `<span class="page-brand">CRS Floor Covering</span>`
  return `
<div class="page-header">
  ${brand}
  <span class="page-tag">${escapeHtml(tag)}</span>
  <span class="page-number">${escapeHtml(inventory.inventoryNumber)}</span>
</div>
`.trim()
}

/**
 * Wrap the document so the header repeats on every printed page (a `<thead>`
 * table-header-group Chromium re-renders per page AND reserves space for). The
 * thead's top padding supplies the per-page top inset, keeping `@page { margin: 0 }`.
 */
export function renderPageFrame(header: string, body: string): string {
  return `
<table class="page-frame">
  <thead>
    <tr><td>${header}</td></tr>
  </thead>
  <tbody>
    <tr><td>
${body}
    </td></tr>
  </tbody>
</table>
`.trim()
}

/**
 * The single inventory record as a label/value block. Iterates the shared
 * inventory field manifest (`INVENTORY_PRINT_FIELD_COLUMNS`), rendering one
 * `<th>label</th><td>value</td>` row per CHECKED column, in manifest order. Cell
 * values come from the manifest's own `value` fn, so the block matches the CSV.
 * Renders nothing when no field is checked.
 */
export function renderInventoryPrimaryBlock(
  inventory: InventoryRow,
  columns: InventoryColumnVisibility,
): string {
  const rows = INVENTORY_PRINT_FIELD_COLUMNS.filter((column) => columns[column.key])
    .map((column) => {
      const isMultiline = column.key === "note"
      const valueClass = isMultiline ? ' class="multiline"' : ""
      return `<tr><th>${escapeHtml(column.label)}</th><td${valueClass}>${escapeOrEmpty(column.value(inventory))}</td></tr>`
    })
    .join("\n    ")
  if (rows.length === 0) return ""
  return `
<table class="inv-primary-table">
  <colgroup>
    <col style="width: 22%;" />
    <col />
  </colgroup>
  <tbody>
    ${rows}
  </tbody>
</table>
`.trim()
}

/**
 * The inventory's adjustments ledger as a flat table. Columns are the CHECKED
 * subset of the shared adjustment manifest (`INVENTORY_PRINT_ADJUSTMENT_COLUMNS`),
 * in manifest order; rows are the selected adjustments (absent selection ⇒ all).
 * Numeric columns right-align. Returns "" when nothing to show (no rows or no
 * columns), so the caller can filter it out.
 */
export function renderInventoryAdjustments(
  adjustments: ReadonlyArray<EnrichedInventoryAdjustmentRow>,
  options: {
    columns: AdjustmentColumnVisibility
    selectedIds?: ReadonlyArray<string>
  },
): string {
  const selectedIds = options.selectedIds ? new Set(options.selectedIds) : null
  const rows = selectedIds ? adjustments.filter((row) => selectedIds.has(row.id)) : adjustments
  const columns = INVENTORY_PRINT_ADJUSTMENT_COLUMNS.filter((column) => options.columns[column.key])
  if (rows.length === 0 || columns.length === 0) return ""

  const headCells = columns
    .map((column) => {
      const numClass = NUMERIC_ADJUSTMENT_KEYS.has(column.key) ? ' class="cl-num"' : ""
      return `<th${numClass}>${escapeHtml(column.label)}</th>`
    })
    .join("\n      ")
  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const numClass = NUMERIC_ADJUSTMENT_KEYS.has(column.key) ? ' class="cl-num"' : ""
          return `<td${numClass}>${escapeOrEmpty(column.value(row))}</td>`
        })
        .join("\n    ")
      return `<tr>\n    ${cells}\n  </tr>`
    })
    .join("\n  ")
  return `
<table class="flat-rows">
  <thead>
    <tr>
      ${headCells}
    </tr>
  </thead>
  <tbody>
  ${bodyRows}
  </tbody>
</table>
`.trim()
}

function escapeOrEmpty(value: string): string {
  if (!value) return `<span class="empty-cell">—</span>`
  return escapeHtml(value)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
