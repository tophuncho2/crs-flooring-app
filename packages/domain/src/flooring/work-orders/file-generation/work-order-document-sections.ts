import type {
  WorkOrderFileCutLogProjection,
  WorkOrderFileGenerationInput,
  WorkOrderFileMaterialItemProjection,
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
  .wo-print-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #111; font-size: 12px; padding: 0.25in; }
  .wo-print-root h2 { font-size: 14px; margin: 18px 0 6px 0; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  .wo-print-root h3 { font-size: 12px; font-weight: 600; margin: 10px 0 4px 0; }
  .wo-print-root table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  .wo-print-root .wo-top-table th, .wo-print-root .wo-top-table td { border: 0; padding: 3px 8px; text-align: left; vertical-align: top; }
  .wo-print-root .wo-top-table th { font-weight: 600; }
  .wo-print-root .property-info-table { table-layout: fixed; }
  .wo-print-root .property-info-table th { width: 14%; }
  .wo-print-root .property-info-table td { width: 26%; }
  .wo-print-root .property-info-address { width: 60%; }
  .wo-print-root .flat-rows { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 12px 0 0 0; }
  .wo-print-root .flat-rows th, .wo-print-root .flat-rows td { border: 0; padding: 3px 8px; font-size: 10px; text-align: left; vertical-align: top; overflow-wrap: break-word; word-break: break-word; }
  .wo-print-root .flat-rows th { font-weight: 600; border-bottom: 1px solid #111; padding-bottom: 2px; }
  .wo-print-root .flat-rows .cl-num { text-align: right; }
  .wo-print-root .page-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: baseline; margin: 0 0 6px 0; }
  .wo-print-root .page-header > span { font-size: 16px; font-weight: 600; }
  .wo-print-root .page-brand { justify-self: start; }
  .wo-print-root .page-number { justify-self: end; }
  .wo-print-root .multiline { white-space: pre-wrap; overflow-wrap: break-word; }
  .wo-print-root .empty-cell { color: #666; }
`

// Shared header (.page-header grid, all three spans the same size):
// "CRS Floor Covering" on the left, the document-type tag centered, and the
// work-order number mirrored to the right.
function renderDocumentHeader(input: WorkOrderFileGenerationInput, tag: string): string {
  return `
<div class="page-header">
  <span class="page-brand">CRS Floor Covering</span>
  <span class="page-tag">${escapeHtml(tag)}</span>
  <span class="page-number">${escapeHtml(input.workOrderNumber)}</span>
</div>
`.trim()
}

export function renderWorkOrderHeader(input: WorkOrderFileGenerationInput): string {
  return renderDocumentHeader(input, "Work Order")
}

export function renderWorkOrderPickingTicketHeader(input: WorkOrderFileGenerationInput): string {
  return renderDocumentHeader(input, "Picking Ticket")
}

export function renderWorkOrderTopTable(
  input: WorkOrderFileGenerationInput,
  options: { includeDescription?: boolean } = {},
): string {
  const dateHeading = input.scheduledFor
    ? escapeHtml(input.scheduledFor)
    : `<span class="empty-cell">—</span>`
  // Description rides as a borderless row in the top table (label under
  // "Job Type", value extending rightward across the remaining columns).
  // Slip-only — the picking ticket omits the description entirely.
  const descriptionRow =
    options.includeDescription && input.description
      ? `
    <tr>
      <th>Description</th><td colspan="3" class="multiline">${escapeHtml(input.description)}</td>
    </tr>`
      : ""
  return `
<h2>${dateHeading}</h2>
<table class="wo-top-table">
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
    </tr>${descriptionRow}
  </tbody>
</table>
`.trim()
}

export function renderWorkOrderInstallerInstructionsBlock(
  input: WorkOrderFileGenerationInput,
): string {
  if (!input.installerInstructions) return ""
  return `
<h2>Installer Instructions</h2>
<div class="multiline">${escapeHtml(input.installerInstructions)}</div>
`.trim()
}

export function renderWorkOrderPropertyInfo(input: WorkOrderFileGenerationInput): string {
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
<table class="wo-top-table property-info-table">
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

export function renderWorkOrderCutLogs(
  items: WorkOrderFileMaterialItemProjection[],
): string {
  // The material-item construct is intentionally not shown on the document —
  // every cut log is flattened into one table and labeled with its parent
  // product name (the leading column).
  const rows = items.flatMap((item) =>
    item.cutLogs.map((cl) => ({ cl, productName: item.productName })),
  )
  if (rows.length === 0) {
    return `<div class="empty-cell">No cut logs.</div>`
  }
  const renderedRows = rows.map(renderCutLogRow).join("\n")
  return `
<table class="flat-rows">
  <colgroup>
    <col style="width: 20%;" />
    <col style="width: 24%;" />
    <col style="width: 14%;" />
    <col style="width: 10%;" />
    <col style="width: 10%;" />
    <col style="width: 10%;" />
    <col style="width: 12%;" />
  </colgroup>
  <thead>
    <tr>
      <th>Product</th>
      <th>Inventory Item</th>
      <th>Location</th>
      <th class="cl-num">Before</th>
      <th class="cl-num">Cut</th>
      <th class="cl-num">After</th>
      <th class="cl-num">Coverage</th>
    </tr>
  </thead>
  <tbody>
    ${renderedRows}
  </tbody>
</table>
`.trim()
}

function formatVacancy(vacancy: "VACANT" | "OCCUPIED" | null): string {
  if (vacancy === "VACANT") return "Vacant"
  if (vacancy === "OCCUPIED") return "Occupied"
  return ""
}

function formatPropertyAddress(property: WorkOrderFileGenerationInput["property"]): string {
  const lines = [
    property.streetAddress,
    [property.city, property.state, property.postalCode].filter(Boolean).join(", "),
  ].filter(Boolean)
  return lines.join("\n")
}

function renderCutLogRow({
  cl,
  productName,
}: {
  cl: WorkOrderFileCutLogProjection
  productName: string
}): string {
  return `
<tr>
  <td>${escapeOrEmpty(productName)}</td>
  <td>${escapeOrEmpty(cl.inventoryItem)}</td>
  <td>${escapeOrEmpty(cl.location)}</td>
  <td class="cl-num">${renderUnitValue(cl.before, cl.stockUnitAbbrev)}</td>
  <td class="cl-num">${renderUnitValue(cl.cut, cl.stockUnitAbbrev)}</td>
  <td class="cl-num">${renderUnitValue(cl.after, cl.stockUnitAbbrev)}</td>
  <td class="cl-num">${renderUnitValue(cl.coverageCut, cl.itemCoverageUnitAbbrev)}</td>
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
