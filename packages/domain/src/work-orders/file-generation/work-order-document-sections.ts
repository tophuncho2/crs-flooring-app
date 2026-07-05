import { buildAddressLine } from "../../shared/address/index.js"
import { formatPhoneNumber } from "../../shared/phone.js"
import { sumAdjustmentQuantities } from "../material-items/adjustment-quantities.js"
import {
  WORK_ORDER_TOP_FIELD_KEYS,
  type WorkOrderAdjustmentColumnVisibility,
  type WorkOrderFileAdjustmentProjection,
  type WorkOrderFileGenerationInput,
  type WorkOrderFileProductAdjustmentGroup,
  type WorkOrderFileProductMaterialItemGroup,
  type WorkOrderMaterialColumnVisibility,
  type WorkOrderTopFieldVisibility,
} from "./types.js"

/**
 * Shared section renderers + style block for the on-demand work-order PRINT
 * VIEWS — the single source of truth for the Picking Ticket, Work Order Slip,
 * and Plan File documents (the worker-generated PDF path they replaced has been
 * removed). The configurator drives these renderers with a per-document config:
 * which top-section values, which bottom columns, and which rows to render.
 *
 * Style-block notes — these render INSIDE the Next app (Tailwind preflight + a
 * single standalone page):
 *   - Every selector is scoped under `.wo-print-root` so Tailwind's preflight
 *     reset (which flattens bare h1/h2/table) cannot win.
 *   - `@page { margin: 0 }` + the inset moved onto `.wo-print-root` padding:
 *     with no page-margin box, the browser cannot inject its default
 *     header/footer (date / URL / page #), so the user never has to uncheck
 *     "Headers and footers" in the print dialog. The padding keeps content
 *     inside every printer's non-printable edge.
 *   - Each view is its own single page (no inter-page `.page-break` rule).
 */

/** Default: every top-section value visible (used when no config is supplied). */
function allTopFieldsVisible(): WorkOrderTopFieldVisibility {
  return Object.fromEntries(
    WORK_ORDER_TOP_FIELD_KEYS.map((key) => [key, true]),
  ) as WorkOrderTopFieldVisibility
}

/** Default: every adjustment detail column visible (Picking Ticket behavior). */
const ALL_ADJUSTMENT_COLUMNS: WorkOrderAdjustmentColumnVisibility = {
  dyeLot: true,
  rollNumber: true,
  adjustment: true,
  location: true,
}

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
// work-order number mirrored to the right. The `tag` is the configurable
// top-center document label (the one part that differs between the presets).
export function renderWorkOrderDocumentHeader(
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
 * empty); the Address line is built from the WO-owned address columns
 * (snapshotted from the property at pick time, then editable).
 */
export function renderWorkOrderInfo(
  input: WorkOrderFileGenerationInput,
  topFields: WorkOrderTopFieldVisibility = allTopFieldsVisible(),
): string {
  const warehouseParts = [
    input.warehouse.name,
    buildAddressLine(input.warehouse),
    formatPhoneNumber(input.warehouse.phone),
  ].filter(Boolean)
  const warehouseCell = warehouseParts.length
    ? escapeHtml(warehouseParts.join(" - "))
    : `<span class="empty-cell">—</span>`
  // Each top-grid cell is a `<th>label</th><td>value</td>` pair, or an empty
  // pair when its checkbox is off — emptying (not removing) the cell keeps the
  // 2×2 grid's shape. Description additionally goes empty when its value is blank.
  const dateCells = topFields.date
    ? `<th>Date</th><td>${escapeOrEmpty(input.scheduledFor)} - ${formatTimeOfDay(input.timeOfDay)}</td>`
    : `<th></th><td></td>`
  const warehouseCells = topFields.warehouse
    ? `<th>Warehouse</th><td>${warehouseCell}</td>`
    : `<th></th><td></td>`
  const jobTypeCells = topFields.jobType
    ? `<th>Job Type</th><td>${escapeOrEmpty(input.jobTypeName)}</td>`
    : `<th></th><td></td>`
  const descriptionCells =
    topFields.description && input.description
      ? `<th>Description</th><td class="multiline">${escapeHtml(input.description)}</td>`
      : `<th></th><td></td>`
  // WO-owned address, flat text — labeled row beneath the Property name.
  const propertyAddress = buildAddressLine({
    streetAddress: input.streetAddress,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
  })
  // Left flex column rows — Entity / Property always render (showing — when
  // blank) when their box is on; the address + instruction rows additionally
  // require a value (mirroring the original omit-when-blank behavior).
  const leftRows = [
    topFields.entity ? `<tr><th>Entity</th><td>${escapeOrEmpty(input.entityName)}</td></tr>` : "",
    topFields.property
      ? `<tr><th>Property</th><td>${escapeOrEmpty(input.property.name)}</td></tr>`
      : "",
    topFields.customerName
      ? `<tr><th>Customer Name</th><td>${escapeOrEmpty(input.customerName)}</td></tr>`
      : "",
    topFields.propertyAddress && propertyAddress
      ? `<tr><th>Address</th><td>${escapeHtml(propertyAddress)}</td></tr>`
      : "",
    topFields.propertyInstructions && input.property.instructions
      ? `<tr><th>Property Instructions</th><td class="multiline">${escapeHtml(input.property.instructions)}</td></tr>`
      : "",
    topFields.installer && input.installer
      ? `<tr><th>Installer</th><td>${escapeHtml(input.installer)}</td></tr>`
      : "",
    topFields.installerInstructions && input.installerInstructions
      ? `<tr><th>Installer Instructions</th><td class="multiline">${escapeHtml(input.installerInstructions)}</td></tr>`
      : "",
  ].filter(Boolean)
  const rightRows = [
    topFields.unitType ? `<tr><th>Unit Type</th><td>${escapeOrEmpty(input.unitType)}</td></tr>` : "",
    topFields.unitNumber
      ? `<tr><th>Unit Number</th><td>${escapeOrEmpty(input.unitNumber)}</td></tr>`
      : "",
    topFields.vacancy
      ? `<tr><th>Vacancy</th><td>${escapeOrEmpty(formatVacancy(input.vacancy))}</td></tr>`
      : "",
  ].filter(Boolean)
  const leftTable = leftRows.length
    ? `
  <table class="wo-top-table wo-mid-left">
    <colgroup>
      <col style="width: 1%;" />
      <col />
    </colgroup>
    <tbody>
      ${leftRows.join("\n      ")}
    </tbody>
  </table>`
    : ""
  const rightTable = rightRows.length
    ? `
  <table class="wo-top-table wo-mid-right">
    <colgroup>
      <col style="width: 1%;" />
      <col />
    </colgroup>
    <tbody>
      ${rightRows.join("\n      ")}
    </tbody>
  </table>`
    : ""
  const midBand =
    leftTable || rightTable ? `\n<div class="wo-mid">${leftTable}${rightTable}\n</div>` : ""
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
      ${dateCells}
      ${warehouseCells}
    </tr>
    <tr>
      ${jobTypeCells}
      ${descriptionCells}
    </tr>
  </tbody>
</table>${midBand}
`.trim()
}

export function renderWorkOrderAdjustments(
  groups: WorkOrderFileProductAdjustmentGroup[],
  options: {
    columns?: WorkOrderAdjustmentColumnVisibility
    selectedIds?: ReadonlyArray<string>
  } = {},
): string {
  // Each detail column toggles independently (default all on → Picking Ticket;
  // all off → the Slip summary of Product / Quantity). `selectedIds`, when
  // supplied, narrows to the chosen adjustment rows — groups left empty drop
  // out, and the per-group subtotal sums only what is shown.
  const columns = options.columns ?? ALL_ADJUSTMENT_COLUMNS
  const selectedIds = options.selectedIds ? new Set(options.selectedIds) : null
  const groupsWithAdjustments = groups
    .map((group) => ({
      productName: group.productName,
      adjustments: selectedIds
        ? group.adjustments.filter((adj) => selectedIds.has(adj.id))
        : group.adjustments,
    }))
    .filter((group) => group.adjustments.length > 0)
  if (groupsWithAdjustments.length === 0) {
    return ""
  }
  // One product group at a time: its adjustment rows, then a summed subtotal
  // row (Quantity) under a rule. Every group gets a subtotal for visual
  // consistency, even single-adjustment groups. Never a grand total.
  const renderedRows = groupsWithAdjustments
    .map((group) => {
      const adjustmentRows = group.adjustments
        .map((adj) => renderAdjustmentRow({ adj, productName: group.productName }, columns))
        .join("\n")
      return `${adjustmentRows}\n${renderSubtotalRow(group.adjustments, columns)}`
    })
    .join("\n")
  const headCells = [
    `<th>Product</th>`,
    columns.dyeLot ? `<th>Dyelot</th>` : "",
    columns.rollNumber ? `<th>Roll#</th>` : "",
    `<th class="cl-num">Quantity</th>`,
    columns.adjustment ? `<th class="cl-num">Adjustment</th>` : "",
    columns.location ? `<th>Location</th>` : "",
  ]
    .filter(Boolean)
    .join("\n      ")
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
  options: {
    columns?: WorkOrderMaterialColumnVisibility
    selectedIds?: ReadonlyArray<string>
  } = {},
): string {
  // Notes toggles independently (default on); Product + Qty/Unit always show.
  // `selectedIds`, when supplied, narrows to the chosen rows — empty groups drop
  // out and the per-group subtotal sums only what is shown.
  const showNotes = options.columns?.notes ?? true
  const selectedIds = options.selectedIds ? new Set(options.selectedIds) : null
  const groupsWithItems = groups
    .map((group) => ({
      productName: group.productName,
      materialItems: selectedIds
        ? group.materialItems.filter((item) => selectedIds.has(item.id))
        : group.materialItems,
    }))
    .filter((group) => group.materialItems.length > 0)
  if (groupsWithItems.length === 0) {
    return ""
  }
  const renderedRows = groupsWithItems
    .map((group) => {
      const itemRows = group.materialItems
        .map((item) => renderMaterialItemRow({ item, productName: group.productName }, showNotes))
        .join("\n")
      return `${itemRows}\n${renderMaterialItemSubtotalRow(group.materialItems, showNotes)}`
    })
    .join("\n")
  const colgroup = showNotes
    ? `<col style="width: 50%;" />
    <col style="width: 35%;" />
    <col style="width: 15%;" />`
    : `<col style="width: 70%;" />
    <col style="width: 30%;" />`
  const headCells = [
    `<th>Product</th>`,
    showNotes ? `<th>Notes</th>` : "",
    `<th class="cl-num">Qty / Unit</th>`,
  ]
    .filter(Boolean)
    .join("\n      ")
  return `
<table class="flat-rows plan-file">
  <colgroup>
    ${colgroup}
  </colgroup>
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

function renderMaterialItemRow(
  {
    item,
    productName,
  }: {
    item: WorkOrderFileProductMaterialItemGroup["materialItems"][number]
    productName: string
  },
  showNotes: boolean,
): string {
  const notesCell = showNotes ? `\n  <td>${escapeOrEmpty(item.notes)}</td>` : ""
  return `
<tr>
  <td>${escapeOrEmpty(productName)}</td>${notesCell}
  <td class="cl-num">${renderUnitValue(item.quantity, item.unitAbbrev)}</td>
</tr>
`.trim()
}

/**
 * Per-product-group subtotal row for the Plan File table — the Qty
 * cell carries the summed quantity under a rule; Product and Notes are empty.
 * Mirrors {@link renderSubtotalRow}. Reuses {@link sumAdjustmentQuantities} by
 * mapping each item to its `{ quantity, unitAbbrev }` shape (the unit suffix
 * is taken from the first item that carries one).
 */
function renderMaterialItemSubtotalRow(
  materialItems: WorkOrderFileProductMaterialItemGroup["materialItems"],
  showNotes: boolean,
): string {
  const { quantity, unitAbbrev } = sumAdjustmentQuantities(
    materialItems.map((item) => ({ quantity: item.quantity, unitAbbrev: item.unitAbbrev })),
  )
  const notesCell = showNotes ? "\n  <td></td>" : ""
  return `
<tr class="group-end">
  <td></td>${notesCell}
  <td class="cl-num subtotal-cell">${renderUnitValue(quantity, unitAbbrev)}</td>
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
  columns: WorkOrderAdjustmentColumnVisibility,
): string {
  // Dyelot/Roll# (after Product) and the before→after Adjustment + Location
  // (after Quantity) each toggle independently. Product + Quantity always show.
  const leadDetailCells = [
    columns.dyeLot ? `\n  <td>${escapeOrEmpty(adj.dyeLot)}</td>` : "",
    columns.rollNumber ? `\n  <td>${escapeOrEmpty(adj.rollNumber)}</td>` : "",
  ].join("")
  const trailDetailCells = [
    columns.adjustment
      ? `\n  <td class="cl-num">${renderTransition(adj.before, adj.after, adj.unitAbbrev)}</td>`
      : "",
    columns.location ? `\n  <td>${escapeOrEmpty(adj.location)}</td>` : "",
  ].join("")
  return `
<tr>
  <td>${escapeOrEmpty(productName)}</td>${leadDetailCells}
  <td class="cl-num">${renderUnitValue(adj.quantity, adj.unitAbbrev)}</td>${trailDetailCells}
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
  adjustments: WorkOrderFileAdjustmentProjection[],
  columns: WorkOrderAdjustmentColumnVisibility,
): string {
  const { quantity, unitAbbrev } = sumAdjustmentQuantities(adjustments)
  const leadDetailCells = [
    columns.dyeLot ? "\n  <td></td>" : "",
    columns.rollNumber ? "\n  <td></td>" : "",
  ].join("")
  const trailDetailCells = [
    columns.adjustment ? "\n  <td></td>" : "",
    columns.location ? "\n  <td></td>" : "",
  ].join("")
  return `
<tr class="group-end">
  <td></td>${leadDetailCells}
  <td class="cl-num subtotal-cell">${renderUnitValue(quantity, unitAbbrev)}</td>${trailDetailCells}
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
