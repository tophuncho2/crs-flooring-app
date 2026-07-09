import type { InventoryRow } from "../types.js"
import { INVENTORY_PRINT_FIELD_COLUMNS, type InventoryColumnVisibility } from "./types.js"

/**
 * Shared section renderers + style block for the on-demand inventory PRINT VIEW.
 * The printed document is the inventory RECORD ONLY — a header that repeats per
 * page and a label/value block of the record's checked fields. The adjustments
 * ledger is deliberately NOT printed (it is unbounded and would overflow any
 * sheet); it exports to CSV instead. The configurator drives the block with a
 * per-document config (which inventory fields show).
 *
 * Style-block notes (identical rationale to the work-order block):
 *   - Every selector is scoped under `.inv-print-root` so Tailwind's preflight
 *     reset cannot flatten bare table/h2.
 *   - `@page { margin: 0 }` with the inset moved onto padding means the browser
 *     injects no default header/footer (date / URL / page #).
 */

export const INV_PRINT_STYLE_BLOCK = `
  @page { size: letter; margin: 0; }
  .inv-print-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #111; font-size: 12px; padding: 0 0.25in 0.25in 0.25in; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .inv-print-root h2 { font-size: 14px; margin: 18px 0 6px 0; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  .inv-print-root table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  .inv-print-root .inv-primary-table { table-layout: fixed; border-bottom: 1px solid #ddd; }
  .inv-print-root .inv-primary-table th, .inv-print-root .inv-primary-table td { border: 0; padding: 3px 8px; text-align: left; vertical-align: top; overflow-wrap: break-word; }
  .inv-print-root .inv-primary-table th { font-weight: 600; white-space: nowrap; padding-right: 16px; width: 22%; }
  .inv-print-root .inv-primary-table td.multiline { white-space: pre-wrap; }
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
 * the right. The `tag` is the (static) top-center document label.
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
 * values come from the manifest's own `value` fn, so the printed block matches the
 * CSV record block. Renders nothing when no field is checked.
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
