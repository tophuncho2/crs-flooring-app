import { buildAddressLine } from "../../../shared/address/index.js"
import { formatPhoneNumber } from "../../../shared/phone.js"
import { sumAdjustmentQuantities } from "../material-items/adjustment-quantities.js"
import type {
  WorkOrderFileAdjustmentProjection,
  WorkOrderFileGenerationInput,
  WorkOrderFileProductAdjustmentGroup,
  WorkOrderFileProductMaterialItemGroup,
} from "./types.js"

/**
 * Shared section renderers + style block for the on-demand work-order
 * PRINT VIEWS (Work Order Slip + Picking Ticket). These mirror the
 * private helpers in `build-work-order-pdf-html.ts` so the browser print
 * output matches the worker-generated PDF page-for-page.
 *
 * This is a deliberate, temporary duplication: the file-generation worker
 * (and `build-work-order-pdf-html.ts`) stays untouched until the print
 * views are confirmed. When the worker is retired the old builder is
 * deleted and these become the single source of truth.
 *
 * Differences from the PDF builder's STYLE_BLOCK — these exist because the
 * print views render INSIDE the Next app (Tailwind preflight + a single
 * standalone page), not as a standalone Puppeteer document:
 *   - Every selector is scoped under `.wo-print-root` so Tailwind's
 *     preflight reset (which flattens bare h1/h2/table) cannot win.
 *   - `@page { margin: 0 }` + the inset moved onto `.wo-print-root` padding:
 *     with no page-margin box, the browser cannot inject its default
 *     header/footer (date / URL / page #), so the user never has to uncheck
 *     "Headers and footers" in the print dialog. The 0.35in padding keeps
 *     content inside every printer's non-printable edge.
 *   - Each view is its own single page, so the PDF's `.page-break` rule is dropped.
 */

export const WO_PRINT_STYLE_BLOCK = `
  @page { size: letter; margin: 0; }
  .wo-print-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #111; font-size: 12px; padding: 0 0.25in 0.25in 0.25in; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .wo-print-root h2 { font-size: 14px; margin: 18px 0 6px 0; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  .wo-print-root h3 { font-size: 12px; font-weight: 600; margin: 10px 0 4px 0; }
  .wo-print-root table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  .wo-print-root .wo-top-table th, .wo-print-root .wo-top-table td { border: 0; padding: 3px 8px; text-align: left; vertical-align: top; }
  .wo-print-root .wo-top-table th { font-weight: 600; white-space: nowrap; padding-right: 16px; }
  .wo-print-root .wo-top-table tr.row-gap > th, .wo-print-root .wo-top-table tr.row-gap > td { padding-top: 12px; }
  .wo-print-root .wo-mid { display: flex; align-items: flex-start; margin: 6px 0; }
  .wo-print-root .wo-mid-left { flex: 0 0 58%; margin: 0; }
  .wo-print-root .wo-mid-right { flex: 1 1 auto; margin: 8px 0; padding-left: 16px; border-left: 1px solid #ddd; }
  .wo-print-root .wo-mid-left table, .wo-print-root .wo-mid-right table { margin: 0; }
  .wo-print-root .wo-mid-right th { padding-right: 4px; }
  .wo-print-root .wo-top-grid { border-bottom: 1px solid #ddd; table-layout: fixed; width: 100%; }
  .wo-print-root .wo-top-grid th, .wo-print-root .wo-top-grid td { border: 0; padding: 3px 8px; text-align: left; vertical-align: top; overflow-wrap: break-word; }
  .wo-print-root .wo-top-grid th { font-weight: 600; white-space: nowrap; padding-right: 4px; }
  .wo-print-root .property-info-table { table-layout: fixed; }
  .wo-print-root .property-info-table th { width: 14%; }
  .wo-print-root .property-info-table td { width: 26%; }
  .wo-print-root .property-info-address { width: 60%; }
  .wo-print-root .flat-rows { width: 100%; border-collapse: collapse; table-layout: auto; margin: 12px 0 0 0; }
  .wo-print-root .flat-rows th, .wo-print-root .flat-rows td { border: 0; padding: 3px 6px; font-size: 13px; text-align: left; vertical-align: top; white-space: nowrap; }
  .wo-print-root .flat-rows th:first-child, .wo-print-root .flat-rows td:first-child { width: 100%; white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
  .wo-print-root .flat-rows th { font-weight: 600; border-bottom: 1px solid #111; padding-bottom: 2px; }
  .wo-print-root .flat-rows tbody tr:nth-child(even) { background: #f0f0f0; }
  .wo-print-root .flat-rows .cl-num { text-align: right; }
  .wo-print-root .flat-rows .subtotal-cell { border-top: 1px solid #111; padding-top: 3px; }
  .wo-print-root .flat-rows tr.group-end td { border-bottom: 1px solid #111; }
  .wo-print-root .flat-rows.plan-file { table-layout: fixed; }
  .wo-print-root .flat-rows.plan-file th, .wo-print-root .flat-rows.plan-file td { white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
  .wo-print-root .flat-rows.plan-file .cl-num { white-space: nowrap; }
  .wo-print-root .page-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; margin: 0 0 14px 0; }
  .wo-print-root .page-header > span { font-size: 16px; font-weight: 600; }
  .wo-print-root .page-brand { justify-self: start; }
  .wo-print-root .page-logo { justify-self: start; height: 56px; width: auto; }
  .wo-print-root .page-number { justify-self: end; }
  .wo-print-root .multiline { white-space: pre-wrap; overflow-wrap: break-word; }
  .wo-print-root .empty-cell { color: #666; }
  .wo-print-root .page-frame { margin: 0; table-layout: fixed; }
  .wo-print-root .page-frame > thead { display: table-header-group; }
  .wo-print-root .page-frame > thead > tr > td { border: 0; padding: 0.5in 0 0 0; }
  .wo-print-root .page-frame > tbody > tr > td { border: 0; padding: 0; }
`

// Shared header (.page-header grid, all three spans the same size):
// "CRS Floor Covering" on the left, the document-type tag centered, and the
// work-order number mirrored to the right.
function renderDocumentHeader(
  input: WorkOrderFileGenerationInput,
  tag: string,
  logoUrl?: string | null,
): string {
  // When a logo URL is supplied (a presigned bucket URL minted by the page
  // loader) render the logo; otherwise fall back to the brand text so the
  // document never breaks if the asset is missing.
  const brand = logoUrl
    ? `<img class="page-logo" src="${escapeHtml(logoUrl)}" alt="CRS Floor Covering" />`
    : `<span class="page-brand">CRS Floor Covering</span>`
  return `
<div class="page-header">
  ${brand}
  <span class="page-tag">${escapeHtml(tag)}</span>
  <span class="page-number">${escapeHtml(input.workOrderNumber)}</span>
</div>
`.trim()
}

export function renderWorkOrderHeader(
  input: WorkOrderFileGenerationInput,
  logoUrl?: string | null,
): string {
  return renderDocumentHeader(input, "Work Order", logoUrl)
}

export function renderWorkOrderPickingTicketHeader(
  input: WorkOrderFileGenerationInput,
  logoUrl?: string | null,
): string {
  return renderDocumentHeader(input, "Picking Ticket", logoUrl)
}

export function renderWorkOrderPlanFileHeader(
  input: WorkOrderFileGenerationInput,
  logoUrl?: string | null,
): string {
  return renderDocumentHeader(input, "Plan File", logoUrl)
}

// Wraps the document so the header repeats on every printed page. The header
// goes in a <thead> (a table-header-group): Chromium re-renders it at the top
// of each page AND reserves vertical space for it, so it never overlaps the
// body — unlike a position: fixed element. The thead's own top padding
// supplies the per-page top inset (the .wo-print-root top padding is dropped),
// keeping @page { margin: 0 } so the browser's default header/footer stays
// suppressed.
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
 * Shared work-order info stack, rendered above the adjustments table on BOTH
 * the Slip and the Picking Ticket (the two diverge only in the adjustments
 * table below). The top four fields sit in a 2×2 grid with tightened
 * label→value padding — Date | Warehouse on row 1, Job Type | Description on
 * row 2 — followed by a continuous label/value table for the rest. Label
 * columns hug their content (width:1% + nowrap labels) so "Entity"
 * never wraps.
 *
 * Order: Date · Warehouse · Job Type · Description (top 2×2 grid). Below the
 * grid a two-column flex band: the left column stacks Entity ·
 * Property (+ flat address beneath) · Property Instructions · Installer
 * Instructions; a vertical divider (the right column's border-left) separates
 * it from the right column — Unit Type · Unit Number · Vacancy — with tightened
 * label→value padding. The band uses align-items:flex-start so the divider only
 * runs as tall as the right column (ending at Vacancy) no matter how far the
 * left column's instructions push downward. Description / address / instruction
 * rows are omitted when their value is blank (the Description grid cell is left
 * empty); the address is the customAddress override or the property's flat
 * address line.
 */
export function renderWorkOrderInfo(input: WorkOrderFileGenerationInput): string {
  const warehouseParts = [
    input.warehouse.name,
    buildAddressLine(input.warehouse),
    formatPhoneNumber(input.warehouse.phone),
  ].filter(Boolean)
  const warehouseCell = warehouseParts.length
    ? escapeHtml(warehouseParts.join(" - "))
    : `<span class="empty-cell">—</span>`
  // Description shares row 2 of the top grid, to the right of Job Type. When
  // blank the cell pair is left empty so the grid keeps its shape.
  const descriptionCells = input.description
    ? `<th>Description</th><td class="multiline">${escapeHtml(input.description)}</td>`
    : `<th></th><td></td>`
  // Property (or custom) address, flat text — labeled row beneath the Property
  // name.
  const propertyAddress = input.customAddress || buildAddressLine(input.property)
  const propertyAddressRow = propertyAddress
    ? `\n    <tr><th>Property Address</th><td>${escapeHtml(propertyAddress)}</td></tr>`
    : ""
  const propertyInstructionsRow = input.property.instructions
    ? `\n    <tr><th>Property Instructions</th><td class="multiline">${escapeHtml(input.property.instructions)}</td></tr>`
    : ""
  const installerInstructionsRow = input.installerInstructions
    ? `\n    <tr><th>Installer Instructions</th><td class="multiline">${escapeHtml(input.installerInstructions)}</td></tr>`
    : ""
  return `
<table class="wo-top-grid">
  <colgroup>
    <col style="width: 13%;" />
    <col style="width: 37%;" />
    <col style="width: 13%;" />
    <col style="width: 37%;" />
  </colgroup>
  <tbody>
    <tr>
      <th>Date</th><td>${escapeOrEmpty(input.scheduledFor)} - ${formatTimeOfDay(input.timeOfDay)}</td>
      <th>Warehouse</th><td>${warehouseCell}</td>
    </tr>
    <tr>
      <th>Job Type</th><td>${escapeOrEmpty(input.jobTypeName)}</td>
      ${descriptionCells}
    </tr>
  </tbody>
</table>
<div class="wo-mid">
  <table class="wo-top-table wo-mid-left">
    <colgroup>
      <col style="width: 1%;" />
      <col />
    </colgroup>
    <tbody>
      <tr><th>Entity</th><td>${escapeOrEmpty(input.entityName)}</td></tr>
      <tr><th>Property</th><td>${escapeOrEmpty(input.property.name)}</td></tr>${propertyAddressRow}${propertyInstructionsRow}${installerInstructionsRow}
    </tbody>
  </table>
  <table class="wo-top-table wo-mid-right">
    <colgroup>
      <col style="width: 1%;" />
      <col />
    </colgroup>
    <tbody>
      <tr><th>Unit Type</th><td>${escapeOrEmpty(input.unitType)}</td></tr>
      <tr><th>Unit Number</th><td>${escapeOrEmpty(input.unitNumber)}</td></tr>
      <tr><th>Vacancy</th><td>${escapeOrEmpty(formatVacancy(input.vacancy))}</td></tr>
    </tbody>
  </table>
</div>
`.trim()
}

export function renderWorkOrderAdjustments(
  groups: WorkOrderFileProductAdjustmentGroup[],
  options: { includeInventoryDetail?: boolean } = {},
): string {
  // includeInventoryDetail (default true → Picking Ticket): the warehouse view
  // adds the Dyelot/Roll# and before→after Adjustment + Location columns. The
  // Slip (false) is the customer-facing summary — Product / Quantity only.
  // BOTH views render the same structure: one row per adjustment grouped by
  // product, each group closed by a summed subtotal row. The only difference is
  // which columns show.
  const includeInventoryDetail = options.includeInventoryDetail ?? true
  const groupsWithAdjustments = groups.filter((group) => group.adjustments.length > 0)
  if (groupsWithAdjustments.length === 0) {
    return ""
  }
  // One product group at a time: its adjustment rows, then a summed subtotal
  // row (Quantity) under a rule. Every group gets a subtotal for visual
  // consistency, even single-adjustment groups. Never a grand total.
  const renderedRows = groupsWithAdjustments
    .map((group) => {
      const adjustmentRows = group.adjustments
        .map((adj) => renderAdjustmentRow({ adj, productName: group.productName }, includeInventoryDetail))
        .join("\n")
      return `${adjustmentRows}\n${renderSubtotalRow(group, includeInventoryDetail)}`
    })
    .join("\n")
  const headCells = includeInventoryDetail
    ? `<th>Product</th>
      <th>Dyelot</th>
      <th>Roll#</th>
      <th class="cl-num">Quantity</th>
      <th class="cl-num">Adjustment</th>
      <th>Location</th>`
    : `<th>Product</th>
      <th class="cl-num">Quantity</th>`
  return `
<table class="flat-rows">
  <thead>
    <tr>
      ${headCells}
    </tr>
  </thead>
  <tbody>
    ${renderedRows}
  </tbody>
</table>
`.trim()
}

/**
 * Plan File body — the WO's material items grouped by product
 * (one block per product, sorted upstream by composed display name), mirroring
 * {@link renderWorkOrderAdjustments}. Three columns: Product · Notes · Qty / Unit.
 * Each group renders one row per item then a summed-quantity subtotal row under a
 * rule (`group-end`/`subtotal-cell`), reusing the adjustments table chrome
 * (`flat-rows`) for identical styling. Unlike the adjustment tables (one greedy
 * first column, the rest nowrap), this view has TWO wrapping text columns
 * (Product + Notes), so it adds the `plan-file` modifier: a fixed table
 * layout with an explicit colgroup so each column gets a stable width and both
 * text columns wrap cleanly — mirroring the `wo-top-grid` fixed-layout precedent.
 * Empty groups are skipped; returns "" when nothing is requested.
 */
export function renderWorkOrderMaterialItems(
  groups: WorkOrderFileProductMaterialItemGroup[],
): string {
  const groupsWithItems = groups.filter((group) => group.materialItems.length > 0)
  if (groupsWithItems.length === 0) {
    return ""
  }
  const renderedRows = groupsWithItems
    .map((group) => {
      const itemRows = group.materialItems
        .map((item) => renderMaterialItemRow({ item, productName: group.productName }))
        .join("\n")
      return `${itemRows}\n${renderMaterialItemSubtotalRow(group)}`
    })
    .join("\n")
  return `
<table class="flat-rows plan-file">
  <colgroup>
    <col style="width: 50%;" />
    <col style="width: 35%;" />
    <col style="width: 15%;" />
  </colgroup>
  <thead>
    <tr>
      <th>Product</th>
      <th>Notes</th>
      <th class="cl-num">Qty / Unit</th>
    </tr>
  </thead>
  <tbody>
    ${renderedRows}
  </tbody>
</table>
`.trim()
}

function renderMaterialItemRow({
  item,
  productName,
}: {
  item: WorkOrderFileProductMaterialItemGroup["materialItems"][number]
  productName: string
}): string {
  return `
<tr>
  <td>${escapeOrEmpty(productName)}</td>
  <td>${escapeOrEmpty(item.notes)}</td>
  <td class="cl-num">${renderUnitValue(item.quantity, item.unitAbbrev)}</td>
</tr>
`.trim()
}

/**
 * Per-product-group subtotal row for the Plan File table — the Qty
 * cell carries the summed quantity under a rule; Product and Notes are empty.
 * Mirrors {@link renderSubtotalRow}. Reuses {@link sumAdjustmentQuantities} by
 * mapping each item to its `{ quantity, stockUnitAbbrev }` shape (the unit suffix
 * is taken from the first item that carries one).
 */
function renderMaterialItemSubtotalRow(group: WorkOrderFileProductMaterialItemGroup): string {
  const { quantity, stockUnitAbbrev } = sumAdjustmentQuantities(
    group.materialItems.map((item) => ({ quantity: item.quantity, stockUnitAbbrev: item.unitAbbrev })),
  )
  return `
<tr class="group-end">
  <td></td>
  <td></td>
  <td class="cl-num subtotal-cell">${renderUnitValue(quantity, stockUnitAbbrev)}</td>
</tr>
`.trim()
}

function formatVacancy(vacancy: "VACANT" | "OCCUPIED" | null): string {
  if (vacancy === "VACANT") return "Vacant"
  if (vacancy === "OCCUPIED") return "Occupied"
  return ""
}

function formatTimeOfDay(timeOfDay: "AM" | "PM" | null): string {
  return timeOfDay ?? "-"
}

function renderAdjustmentRow(
  {
    adj,
    productName,
  }: {
    adj: WorkOrderFileAdjustmentProjection
    productName: string
  },
  includeInventoryDetail: boolean,
): string {
  // Dyelot/Roll# (after Product) and the before→after Adjustment + Location
  // (after Quantity) are warehouse-only (Picking Ticket); the Slip omits them,
  // leaving Product / Quantity.
  const leadDetailCells = includeInventoryDetail
    ? `\n  <td>${escapeOrEmpty(adj.dyeLot)}</td>\n  <td>${escapeOrEmpty(adj.rollNumber)}</td>`
    : ""
  const trailDetailCells = includeInventoryDetail
    ? `\n  <td class="cl-num">${renderTransition(adj.before, adj.after, adj.stockUnitAbbrev)}</td>\n  <td>${escapeOrEmpty(adj.location)}</td>`
    : ""
  return `
<tr>
  <td>${escapeOrEmpty(productName)}</td>${leadDetailCells}
  <td class="cl-num">${renderUnitValue(adj.quantity, adj.stockUnitAbbrev)}</td>${trailDetailCells}
</tr>
`.trim()
}

/**
 * A per-product-group subtotal row appended beneath the group's adjustment
 * rows. The Quantity cell carries the group sum under a rule (`.subtotal-cell`
 * border-top); every other cell is empty. Mirrors `renderAdjustmentRow`'s
 * column layout — six cells on the Picking Ticket (includeInventoryDetail),
 * two on the Slip (Product / Quantity).
 *
 * This is the last row of its group, so it carries `class="group-end"`: a
 * full-width dark bottom border that closes the group. With border-collapse it
 * also forms the top divider of the next group; the column-header border
 * (`.flat-rows th`) supplies the top divider of the first group.
 */
function renderSubtotalRow(
  group: WorkOrderFileProductAdjustmentGroup,
  includeInventoryDetail: boolean,
): string {
  const { quantity, stockUnitAbbrev } = sumAdjustmentQuantities(group.adjustments)
  const leadDetailCells = includeInventoryDetail ? "\n  <td></td>\n  <td></td>" : ""
  const trailDetailCells = includeInventoryDetail ? "\n  <td></td>\n  <td></td>" : ""
  return `
<tr class="group-end">
  <td></td>${leadDetailCells}
  <td class="cl-num subtotal-cell">${renderUnitValue(quantity, stockUnitAbbrev)}</td>${trailDetailCells}
</tr>
`.trim()
}

function renderUnitValue(value: string, unitAbbrev: string): string {
  if (value === "") return `<span class="empty-cell">—</span>`
  if (unitAbbrev === "") return escapeHtml(value)
  return `${escapeHtml(value)} ${escapeHtml(unitAbbrev)}`
}

/** Before → After balance transition (arrow U+2192). Shows a single em-dash until both sides exist. */
function renderTransition(before: string, after: string, unitAbbrev: string): string {
  if (before === "" || after === "") return `<span class="empty-cell">—</span>`
  return `${renderUnitValue(before, unitAbbrev)} → ${renderUnitValue(after, unitAbbrev)}`
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
