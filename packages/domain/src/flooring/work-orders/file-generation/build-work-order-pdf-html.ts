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
 *  - Header: WO number + vacancy badge
 *  - Property + warehouse + management info table
 *  - Address block (custom address override falls back to joined property
 *    address); property instructions render directly under the address
 *  - WO instructions / description / notes (omitted when blank)
 *  - Material items table; each row followed by a nested cut-logs sub-table
 *    (only when cut logs exist for the row)
 *
 * Markup is intentionally minimal and styled inline so the rendered PDF
 * does not depend on external CSS. Every dynamic value passes through
 * `escapeHtml` to keep stray characters from breaking the document.
 */

const STYLE_BLOCK = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #111; margin: 32px; font-size: 12px; }
  h1 { font-size: 22px; margin: 0 0 4px 0; }
  h2 { font-size: 14px; margin: 24px 0 8px 0; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  h3 { font-size: 12px; margin: 12px 0 4px 0; color: #333; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f4f4f4; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-left: 4px; }
  .badge-vacant { background: #cce5ff; color: #004085; }
  .badge-occupied { background: #f8d7da; color: #721c24; }
  .cut-log-pending { background: #fff8db; }
  .cut-log-final { background: #e8f5e9; }
  .cut-log-void { background: #f0f0f0; color: #999; text-decoration: line-through; }
  .cut-log-table { margin: 4px 0 16px 16px; }
  .cut-log-table th, .cut-log-table td { font-size: 11px; padding: 4px 6px; }
  .multiline { white-space: pre-wrap; }
  .empty-cell { color: #999; font-style: italic; }
`

export function buildWorkOrderPdfHtml(input: WorkOrderFileGenerationInput): string {
  const sections = [
    renderHeader(input),
    renderMetaTable(input),
    renderAddressBlock(input),
    renderInstructionsBlock(input),
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
  const vacancyBadge = renderVacancyBadge(input.vacancy)
  return `<h1>Work Order ${escapeHtml(input.workOrderNumber)}${vacancyBadge}</h1>`
}

function renderVacancyBadge(vacancy: "VACANT" | "OCCUPIED" | null): string {
  if (vacancy === "VACANT") return `<span class="badge badge-vacant">Vacant</span>`
  if (vacancy === "OCCUPIED") return `<span class="badge badge-occupied">Occupied</span>`
  return ""
}

function renderMetaTable(input: WorkOrderFileGenerationInput): string {
  return `
<h2>Details</h2>
<table>
  <tbody>
    <tr><th>Property</th><td>${escapeOrEmpty(input.property.name)}</td><th>Warehouse</th><td>${escapeOrEmpty(input.warehouseName)}</td></tr>
    <tr><th>Management Company</th><td>${escapeOrEmpty(input.managementCompanyName)}</td><th>Job Type</th><td>${escapeOrEmpty(input.jobTypeName)}</td></tr>
    <tr><th>Template</th><td>${escapeOrEmpty(input.templateNumber)}</td><th>Scheduled For</th><td>${escapeOrEmpty(input.scheduledFor)}</td></tr>
    <tr><th>Unit Number</th><td>${escapeOrEmpty(input.unitNumber)}</td><th>Unit Type</th><td>${escapeOrEmpty(input.unitType)}</td></tr>
  </tbody>
</table>
`.trim()
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

function renderInstructionsBlock(input: WorkOrderFileGenerationInput): string {
  const blocks: string[] = []
  if (input.instructions) {
    blocks.push(`<h3>Work Order Instructions</h3><div class="multiline">${escapeHtml(input.instructions)}</div>`)
  }
  if (input.description) {
    blocks.push(`<h3>Description</h3><div class="multiline">${escapeHtml(input.description)}</div>`)
  }
  if (input.notes) {
    blocks.push(`<h3>Notes</h3><div class="multiline">${escapeHtml(input.notes)}</div>`)
  }
  if (blocks.length === 0) return ""
  return `<h2>Notes & Instructions</h2>${blocks.join("\n")}`
}

function renderMaterialItems(items: WorkOrderFileMaterialItemProjection[]): string {
  if (items.length === 0) {
    return `<h2>Material Items</h2><div class="empty-cell">No material items.</div>`
  }
  const rows = items.map((item) => renderMaterialItemRow(item)).join("\n")
  return `
<h2>Material Items</h2>
<table>
  <thead>
    <tr>
      <th style="width: 45%;">Product</th>
      <th style="width: 20%;">Quantity</th>
      <th style="width: 35%;">Notes</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>
`.trim()
}

function renderMaterialItemRow(item: WorkOrderFileMaterialItemProjection): string {
  const quantityLabel = item.sendUnitAbbrev
    ? `${escapeHtml(item.quantity)} ${escapeHtml(item.sendUnitAbbrev)}`
    : escapeHtml(item.quantity)
  const cutLogTable = renderCutLogTable(item)
  return `
<tr>
  <td>${escapeOrEmpty(item.productName)}</td>
  <td>${quantityLabel}</td>
  <td class="multiline">${escapeOrEmpty(item.notes)}</td>
</tr>
${cutLogTable === "" ? "" : `<tr><td colspan="3">${cutLogTable}</td></tr>`}
`.trim()
}

function renderCutLogTable(item: WorkOrderFileMaterialItemProjection): string {
  if (item.cutLogs.length === 0) return ""
  // Coverage column is shown when at least one cut log under this WOMI carries
  // a coverage unit snapshot or a coverage value. Otherwise the column would
  // be empty visual noise.
  const showCoverage = item.cutLogs.some(
    (cl) => cl.itemCoverageUnitAbbrev !== "" || cl.coverageCut !== "",
  )
  const rows = item.cutLogs.map((cl) => renderCutLogRow(cl, { showCoverage })).join("\n")
  const coverageHeaderCell = showCoverage ? `<th style="width: 14%;">Coverage Cut</th>` : ""
  return `
<h3 style="margin: 0 0 4px 16px;">Cut Logs</h3>
<table class="cut-log-table">
  <thead>
    <tr>
      <th style="width: 14%;">Cut #</th>
      <th style="width: 18%;">Inventory</th>
      <th style="width: 11%;">Before</th>
      <th style="width: 11%;">Cut</th>
      <th style="width: 11%;">After</th>
      ${coverageHeaderCell}
      <th style="width: 7%;">Waste</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>
`.trim()
}

function renderCutLogRow(
  cl: WorkOrderFileCutLogProjection,
  options: { showCoverage: boolean },
): string {
  const rowClass = statusToClass(cl.status)
  // Unicode checkbox glyphs print cleanly in Puppeteer-rendered PDFs and
  // require no extra font assets.
  const wasteCell = cl.isWaste ? "&#9745;" : "&#9744;"
  const inventoryCell = renderInventoryCell(cl)
  const coverageCell = options.showCoverage
    ? `<td>${renderUnitValue(cl.coverageCut, cl.itemCoverageUnitAbbrev)}</td>`
    : ""
  return `
<tr class="${rowClass}">
  <td>${escapeOrEmpty(cl.cutLogNumber)}</td>
  <td>${escapeOrEmpty(inventoryCell)}</td>
  <td>${renderUnitValue(cl.before, cl.stockUnitAbbrev)}</td>
  <td>${renderUnitValue(cl.cut, cl.stockUnitAbbrev)}</td>
  <td>${renderUnitValue(cl.after, cl.stockUnitAbbrev)}</td>
  ${coverageCell}
  <td style="text-align: center; font-size: 14px;">${wasteCell}</td>
  <td class="multiline">${escapeOrEmpty(cl.notes)}</td>
</tr>
`.trim()
}

function renderInventoryCell(cl: WorkOrderFileCutLogProjection): string {
  // Single-line identity string sourced from the cut log row's snapshot
  // columns. Parts are joined with " - " and missing parts are skipped so
  // empty Item / DyeLot do not produce stray hyphens.
  const parts = [cl.inventoryNumber, cl.inventoryItemNumber, cl.inventoryDyeLot].filter(
    (part) => part !== "",
  )
  return parts.join(" - ")
}

function renderUnitValue(value: string, unitAbbrev: string): string {
  if (value === "") return `<span class="empty-cell">—</span>`
  if (unitAbbrev === "") return escapeHtml(value)
  return `${escapeHtml(value)} ${escapeHtml(unitAbbrev)}`
}

function statusToClass(status: WorkOrderFileCutLogProjection["status"]): string {
  switch (status) {
    case "FINAL":
      return "cut-log-final"
    case "VOID":
      return "cut-log-void"
    default:
      return "cut-log-pending"
  }
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
