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
 * Two-page layout (forced page break between):
 *
 *   Page 1 — Work Order:
 *     - H1: Work Order number
 *     - H2: scheduled date (or "—" when unscheduled)
 *     - Top table: warehouse | mgmt co, job type | property
 *     - Description block (omitted if empty)
 *     - H2: "Property Info"
 *     - Property Info table: address + property instructions on the left,
 *       vacancy / unit type / unit number on the right
 *     - Installer Instructions block (omitted if empty)
 *     - H2: Material Items — one borderless WOMI row per item
 *       followed by a borderless cut-log block
 *
 *   Page 2 — Picking Ticket:
 *     - H1 + "Picking Ticket" tag in the top-right
 *     - H2: scheduled date
 *     - Same top table as page 1
 *     - Same Material Items + cut logs as page 1 (no Property Info,
 *       no description)
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
  .property-info-table th { width: 14%; }
  .property-info-table td { width: 26%; }
  .property-info-address { width: 60%; }
  .womi-group { margin: 12px 0 14px 0; page-break-inside: avoid; }
  .flat-rows { width: 100%; border-collapse: collapse; margin: 2px 0 0 0; }
  .flat-rows th, .flat-rows td { border: 0; padding: 3px 8px; font-size: 11px; text-align: left; vertical-align: top; }
  .flat-rows th { font-weight: 600; border-bottom: 1px solid #111; padding-bottom: 2px; }
  .womi-rows { margin-bottom: 2px; }
  .page-break { page-break-before: always; break-before: page; }
  .page-header { display: flex; justify-content: space-between; align-items: baseline; }
  .page-tag { font-size: 16px; font-weight: 600; }
  .multiline { white-space: pre-wrap; }
  .empty-cell { color: #666; }
`

export function buildWorkOrderPdfHtml(input: WorkOrderFileGenerationInput): string {
  const page1 = [
    renderHeader(input),
    renderTopTable(input),
    renderDescriptionBlock(input),
    renderPropertyInfo(input),
    renderInstallerInstructionsBlock(input),
    renderMaterialItems(input.materialItems),
  ].join("\n")

  const page2 = renderPickingTicketPage(input)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Work Order ${escapeHtml(input.workOrderNumber)}</title>
  <style>${STYLE_BLOCK}</style>
</head>
<body>
${page1}
${page2}
</body>
</html>`
}

function renderHeader(input: WorkOrderFileGenerationInput): string {
  return `<h1>Work Order ${escapeHtml(input.workOrderNumber)}</h1>`
}

function renderPickingTicketPage(input: WorkOrderFileGenerationInput): string {
  return `
<div class="page-break">
  <div class="page-header">
    <h1>Work Order ${escapeHtml(input.workOrderNumber)}</h1>
    <span class="page-tag">Picking Ticket</span>
  </div>
  ${renderTopTable(input)}
  ${renderMaterialItems(input.materialItems)}
</div>
`.trim()
}

function renderTopTable(input: WorkOrderFileGenerationInput): string {
  const dateHeading = input.scheduledFor
    ? escapeHtml(input.scheduledFor)
    : `<span class="empty-cell">—</span>`
  return `
<h2>${dateHeading}</h2>
<table class="grid-table">
  <colgroup>
    <col style="width: 14%;" />
    <col style="width: 24%;" />
    <col style="width: 20%;" />
    <col style="width: 42%;" />
  </colgroup>
  <tbody>
    <tr>
      <th>Warehouse</th><td>${escapeOrEmpty(input.warehouseName)}</td>
      <th>Management Company</th><td>${escapeOrEmpty(input.managementCompanyName)}</td>
    </tr>
    <tr>
      <th>Job Type</th><td>${escapeOrEmpty(input.jobTypeName)}</td>
      <th>Property</th><td>${escapeOrEmpty(input.property.name)}</td>
    </tr>
  </tbody>
</table>
`.trim()
}

function renderDescriptionBlock(input: WorkOrderFileGenerationInput): string {
  if (!input.description) return ""
  return `
<table class="grid-table">
  <thead>
    <tr><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td class="multiline">${escapeHtml(input.description)}</td></tr>
  </tbody>
</table>
`.trim()
}

function renderInstallerInstructionsBlock(input: WorkOrderFileGenerationInput): string {
  if (!input.installerInstructions) return ""
  return `
<table class="grid-table">
  <thead>
    <tr><th>Installer Instructions</th></tr>
  </thead>
  <tbody>
    <tr><td class="multiline">${escapeHtml(input.installerInstructions)}</td></tr>
  </tbody>
</table>
`.trim()
}

function formatVacancy(vacancy: "VACANT" | "OCCUPIED" | null): string {
  if (vacancy === "VACANT") return "Vacant"
  if (vacancy === "OCCUPIED") return "Occupied"
  return ""
}

function renderPropertyInfo(input: WorkOrderFileGenerationInput): string {
  const address = input.customAddress || formatPropertyAddress(input.property)
  const addressMarkup = address
    ? `<div class="multiline">${escapeHtml(address)}</div>`
    : `<span class="empty-cell">—</span>`
  const instructionsMarkup = input.property.instructions
    ? `<h3>Property Instructions</h3><div class="multiline">${escapeHtml(input.property.instructions)}</div>`
    : ""
  const vacancyLabel = formatVacancy(input.vacancy)
  return `
<h2>Property Info</h2>
<table class="grid-table property-info-table">
  <tbody>
    <tr>
      <td class="property-info-address" rowspan="3">
        <h3>Address</h3>
        ${addressMarkup}
        ${instructionsMarkup}
      </td>
      <th>Vacancy</th><td>${escapeOrEmpty(vacancyLabel)}</td>
    </tr>
    <tr>
      <th>Unit Type</th><td>${escapeOrEmpty(input.unitType)}</td>
    </tr>
    <tr>
      <th>Unit Number</th><td>${escapeOrEmpty(input.unitNumber)}</td>
    </tr>
  </tbody>
</table>
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
  <table class="flat-rows womi-rows">
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
<table class="flat-rows">
  <colgroup>
    <col style="width: 20%;" />
    <col style="width: 9%;" />
    <col style="width: 7%;" />
    <col style="width: 7%;" />
    <col style="width: 7%;" />
    <col style="width: 10%;" />
    <col style="width: 40%;" />
  </colgroup>
  <thead>
    <tr>
      <th>Inventory Item</th>
      <th>Location</th>
      <th>Before</th>
      <th>Cut</th>
      <th>After</th>
      <th>Coverage Cut</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>
`.trim()
}

function renderCutLogRow(cl: WorkOrderFileCutLogProjection): string {
  return `
<tr>
  <td>${escapeOrEmpty(cl.inventoryItem)}</td>
  <td>${escapeOrEmpty(cl.location)}</td>
  <td>${renderUnitValue(cl.before, cl.stockUnitAbbrev)}</td>
  <td>${renderUnitValue(cl.cut, cl.stockUnitAbbrev)}</td>
  <td>${renderUnitValue(cl.after, cl.stockUnitAbbrev)}</td>
  <td>${renderUnitValue(cl.coverageCut, cl.itemCoverageUnitAbbrev)}</td>
  <td class="multiline">${escapeOrEmpty(cl.notes)}</td>
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
