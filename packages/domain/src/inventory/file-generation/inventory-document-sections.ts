import { composeRollNumberDisplay } from "../formatters.js"
import type { InventoryRow } from "../types.js"
import {
  INVENTORY_PRINT_CELL_FIELDS,
  INVENTORY_PRINT_LEDGER_ROW_COUNT,
  type InventoryColumnVisibility,
} from "./types.js"

/**
 * Shared section renderers + style block for the on-demand inventory PRINT VIEW —
 * a physical ROLL TAG the operator prints, attaches to the roll, and hand-writes
 * on as they cut it. It has three parts: the repeating page header, a primary
 * block (the big Roll# heading + a small fixed label/value cell grid), and a BLANK
 * write-in grid (Date · Adjustment · Balance) with rotated headers and empty rows
 * the operator fills in by hand. The adjustments DATA ledger is never printed (it
 * is unbounded); it exports to CSV instead. The configurator drives the cell grid
 * with a per-document config (which of the four cells show).
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
  .inv-print-root .inv-roll-number { text-align: center; font-size: 48px; font-weight: 700; letter-spacing: 1px; margin: 4px 0 14px 0; line-height: 1.1; }
  .inv-print-root .inv-roll-number .empty-cell { color: #999; }
  .inv-print-root .inv-cell-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 28px; row-gap: 6px; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #ddd; }
  .inv-print-root .inv-cell { display: flex; gap: 10px; align-items: baseline; overflow-wrap: break-word; }
  .inv-print-root .inv-cell-label { font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.4px; color: #444; white-space: nowrap; min-width: 92px; }
  .inv-print-root .inv-cell-value { font-size: 13px; }
  .inv-print-root .inv-writein { table-layout: fixed; margin: 0; }
  .inv-print-root .inv-writein th, .inv-print-root .inv-writein td { border: 1px solid #333; padding: 0; }
  .inv-print-root .inv-writein thead th { height: 0.95in; vertical-align: bottom; text-align: center; }
  .inv-print-root .inv-writein .rot { display: inline-block; writing-mode: vertical-rl; transform: rotate(180deg); font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; padding: 4px 0; }
  .inv-print-root .inv-writein tbody td { height: 0.4in; }
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
 * The roll-tag primary block: the big centered Roll# heading, then a small
 * two-column label/value grid of the CHECKED print cells (Style, Color, Starting
 * Stock, Created Date — {@link INVENTORY_PRINT_CELL_FIELDS}). Cells fill the two
 * columns column-major (first half left, remainder right) to mirror the physical
 * tag's left/right layout. Cell values come from the manifest's own `value` fn.
 * The Roll# heading always renders (it is the tag's identity, not a toggleable cell).
 */
export function renderInventoryPrimaryBlock(
  inventory: InventoryRow,
  columns: InventoryColumnVisibility,
): string {
  const rollNumber = composeRollNumberDisplay(inventory.rollPrefix, inventory.rollNumber)
  const heading = `<div class="inv-roll-number">${escapeOrEmpty(rollNumber)}</div>`

  const cells = INVENTORY_PRINT_CELL_FIELDS.filter((column) => columns[column.key]).map(
    (column) =>
      `<div class="inv-cell"><span class="inv-cell-label">${escapeHtml(
        column.label,
      )}</span><span class="inv-cell-value">${escapeOrEmpty(column.value(inventory))}</span></div>`,
  )
  if (cells.length === 0) return heading

  // Column-major split: the first half fills the left column, the rest the right.
  const leftCount = Math.ceil(cells.length / 2)
  const grid = `<div class="inv-cell-grid">
    ${cells.slice(0, leftCount).join("\n    ")}
    ${cells.slice(leftCount).join("\n    ")}
  </div>`
  return `${heading}\n${grid}`
}

/**
 * The blank write-in grid printed below the primary block — a three-column table
 * (Date · Adjustment · Balance) with SIDEWAYS (rotated) header labels and
 * {@link INVENTORY_PRINT_LEDGER_ROW_COUNT} EMPTY ruled rows. It carries NO data:
 * the operator hand-writes each cut's date/adjustment/remaining-balance onto the
 * physical tag. (The adjustments DATA ledger is CSV-only and never printed.)
 */
export function renderInventoryWriteInGrid(): string {
  const header = ["Date", "Adjustment", "Balance"]
    .map((label) => `<th><span class="rot">${escapeHtml(label)}</span></th>`)
    .join("")
  const emptyRow = "<tr><td></td><td></td><td></td></tr>"
  const rows = Array.from({ length: INVENTORY_PRINT_LEDGER_ROW_COUNT }, () => emptyRow).join("\n    ")
  return `
<table class="inv-writein">
  <colgroup>
    <col style="width: 24%;" />
    <col />
    <col style="width: 24%;" />
  </colgroup>
  <thead>
    <tr>${header}</tr>
  </thead>
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
