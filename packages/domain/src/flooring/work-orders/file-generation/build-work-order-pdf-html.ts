import type {
  WorkOrderFileCutLogProjection,
  WorkOrderFileGenerationInput,
  WorkOrderFileMaterialItemProjection,
} from "./types.js"

/**
 * Pure projection from the joined work-order read shape to a printable
 * HTML string. Worker passes the result to `renderHtmlToPdf` from
 * `@builders/pdf`. No I/O, no async.
 *
 * Layout, top to bottom:
 *  - Header: WO number
 *  - Details table: warehouse, job type, scheduled date, management co,
 *    property, template, vacancy, unit #, unit type, description
 *  - Address block (custom override falls back to property address;
 *    property.instructions render below the address)
 *  - Material items: one bordered single-row table per WOMI followed
 *    by a borderless aligned-text cut-log block. No grouping table —
 *    each WOMI's cut logs sit flush-left with their WOMI's product cell.
 *
 * Markup is intentionally minimal and styled inline so the rendered PDF
 * does not depend on external CSS. Every dynamic value passes through
 * `escapeHtml` to keep stray characters from breaking the document.
 */

const STYLE_BLOCK = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #111; margin: 16px 18px; font-size: 12px; }
  h1 { font-size: 22px; margin: 0 0 6px 0; }
  h2 { font-size: 14px; margin: 18px 0 6px 0; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  h3 { font-size: 12px; margin: 10px 0 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  .grid-table th, .grid-table td { border: 1px solid #ddd; padding: 5px 8px; text-align: left; vertical-align: top; }
  .grid-table th { font-weight: 600; }
  .womi-group { margin: 12px 0 14px 0; page-break-inside: avoid; }
  .cut-log-rows { width: 100%; border-collapse: collapse; margin: 2px 0 0 0; }
  .cut-log-rows th, .cut-log-rows td { border: 0; padding: 3px 8px; font-size: 11px; text-align: left; vertical-align: top; }
  .cut-log-rows th { font-weight: 600; border-bottom: 1px solid #111; padding-bottom: 2px; }
  .cut-log-rows td.waste { text-align: center; font-size: 13px; }
  .multiline { white-space: pre-wrap; }
  .empty-cell { color: #666; }
`

export function buildWorkOrderPdfHtml(input: WorkOrderFileGenerationInput): string {
  const sections = [
    renderHeader(input),
    renderDetailsTable(input),
    renderAddressBlock(input),
    renderMaterialItems(input.materialItems),
  ].join("\n")

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Work Order ${escapeHtml(input.workOrderNumber)}</title>
  <style>${STYLE_BLOCK}</style>
</head>
<body>
${sections}
</body>
</html>`
}

function renderHeader(input: WorkOrderFileGenerationInput): string {
  return `<h1>Work Order ${escapeHtml(input.workOrderNumber)}</h1>`
}

function renderDetailsTable(input: WorkOrderFileGenerationInput): string {
  // 4-column key/value grid: 11 cells across the 5-row layout.
  // Row 5 col 3-4 reserved for description (spans 2 cols since it can be long).
  const vacancyLabel = formatVacancy(input.vacancy)
  return `
<h2>Details</h2>
<table class="grid-table">
  <tbody>
    <tr>
      <th>Warehouse</th><td>${escapeOrEmpty(input.warehouseName)}</td>
      <th>Job Type</th><td>${escapeOrEmpty(input.jobTypeName)}</td>
    </tr>
    <tr>
      <th>Date</th><td>${escapeOrEmpty(input.scheduledFor)}</td>
      <th>Management Company</th><td>${escapeOrEmpty(input.managementCompanyName)}</td>
    </tr>
    <tr>
      <th>Property</th><td>${escapeOrEmpty(input.property.name)}</td>
      <th>Template</th><td>${escapeOrEmpty(input.templateNumber)}</td>
    </tr>
    <tr>
      <th>Vacancy</th><td>${escapeOrEmpty(vacancyLabel)}</td>
      <th>Unit Number</th><td>${escapeOrEmpty(input.unitNumber)}</td>
    </tr>
    <tr>
      <th>Unit Type</th><td>${escapeOrEmpty(input.unitType)}</td>
      <th>Description</th><td colspan="1" class="multiline">${escapeOrEmpty(input.description)}</td>
    </tr>
  </tbody>
</table>
`.trim()
}

function formatVacancy(vacancy: "VACANT" | "OCCUPIED" | null): string {
  if (vacancy === "VACANT") return "Vacant"
  if (vacancy === "OCCUPIED") return "Occupied"
  return ""
}

function renderAddressBlock(input: WorkOrderFileGenerationInput): string {
  const address = input.customAddress || formatPropertyAddress(input.property)
  if (!address && !input.property.instructions) return ""
  const label = input.customAddress ? "Custom Address" : "Property Address"
  const addressMarkup = address ? `<div class="multiline">${escapeHtml(address)}</div>` : ""
  const instructionsMarkup = input.property.instructions
    ? `<h3>Property Instructions</h3><div class="multiline">${escapeHtml(input.property.instructions)}</div>`
    : ""
  return `
<h2>${label}</h2>
${addressMarkup}
${instructionsMarkup}
`.trim()
}

function formatPropertyAddress(property: WorkOrderFileGenerationInput["property"]): string {
  const lines = [
    property.streetAddress,
    [property.city, property.state, property.postalCode].filter(Boolean).join(", "),
  ].filter(Boolean)
  return lines.join("\n")
}

function renderMaterialItems(items: WorkOrderFileMaterialItemProjection[]): string {
  if (items.length === 0) {
    return `<h2>Material Items</h2><div class="empty-cell">No material items.</div>`
  }
  const groups = items.map((item) => renderMaterialItemGroup(item)).join("\n")
  return `
<h2>Material Items</h2>
${groups}
`.trim()
}

function renderMaterialItemGroup(item: WorkOrderFileMaterialItemProjection): string {
  const quantityLabel = item.sendUnitAbbrev
    ? `${escapeHtml(item.quantity)} ${escapeHtml(item.sendUnitAbbrev)}`
    : escapeHtml(item.quantity)

  const cutLogs = renderCutLogRows(item.cutLogs)

  return `
<div class="womi-group">
  <table class="grid-table">
    <thead>
      <tr>
        <th style="width: 45%;">Product</th>
        <th style="width: 20%;">Quantity</th>
        <th style="width: 35%;">Notes</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${escapeOrEmpty(item.productName)}</td>
        <td>${quantityLabel}</td>
        <td class="multiline">${escapeOrEmpty(item.notes)}</td>
      </tr>
    </tbody>
  </table>
  ${cutLogs}
</div>
`.trim()
}

function renderCutLogRows(cutLogs: WorkOrderFileCutLogProjection[]): string {
  if (cutLogs.length === 0) return ""
  const rows = cutLogs.map(renderCutLogRow).join("\n")
  return `
<table class="cut-log-rows">
  <thead>
    <tr>
      <th>Inventory Item</th>
      <th>Location</th>
      <th>Before</th>
      <th>Cut</th>
      <th>After</th>
      <th>Coverage Cut</th>
      <th>Notes</th>
      <th>Waste</th>
      <th>Cut Log #</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>
`.trim()
}

function renderCutLogRow(cl: WorkOrderFileCutLogProjection): string {
  // Unicode checkbox glyphs print cleanly in Puppeteer-rendered PDFs and
  // require no extra font assets.
  const wasteCell = cl.isWaste ? "&#9745;" : "&#9744;"
  return `
<tr>
  <td>${escapeOrEmpty(cl.inventoryItem)}</td>
  <td>${escapeOrEmpty(cl.location)}</td>
  <td>${renderUnitValue(cl.before, cl.stockUnitAbbrev)}</td>
  <td>${renderUnitValue(cl.cut, cl.stockUnitAbbrev)}</td>
  <td>${renderUnitValue(cl.after, cl.stockUnitAbbrev)}</td>
  <td>${renderUnitValue(cl.coverageCut, cl.itemCoverageUnitAbbrev)}</td>
  <td class="multiline">${escapeOrEmpty(cl.notes)}</td>
  <td class="waste">${wasteCell}</td>
  <td>${escapeOrEmpty(cl.cutLogNumber)}</td>
</tr>
`.trim()
}

function renderUnitValue(value: string, unitAbbrev: string): string {
  if (value === "") return `<span class="empty-cell">—</span>`
  if (unitAbbrev === "") return escapeHtml(value)
  return `${escapeHtml(value)} ${escapeHtml(unitAbbrev)}`
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
