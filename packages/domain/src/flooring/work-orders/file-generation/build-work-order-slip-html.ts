import type { WorkOrderFileGenerationInput } from "./types.js"
import {
  WO_PRINT_STYLE_BLOCK,
  renderWorkOrderCutLogs,
  renderWorkOrderHeader,
  renderWorkOrderInstallerInstructionsBlock,
  renderWorkOrderPropertyInfo,
  renderWorkOrderTopTable,
} from "./work-order-document-sections.js"

/**
 * The "Work Order Slip" document, rendered as a self-contained HTML
 * fragment for the on-demand print view (the canonical work-order page
 * since the file-generation worker was retired):
 *
 *   - Header: "CRS Floor Covering" (left) · centered "Work Order" tag ·
 *     work-order number (right) — all the same size
 *   - H2 scheduled date + warehouse / mgmt co / job type / property table,
 *     with the description as a borderless row beneath Job Type (omitted
 *     when empty)
 *   - Property Info (address — customAddress overrides property address —
 *     property instructions always shown when present, vacancy/unit fields)
 *   - Installer Instructions block (omitted when empty)
 *   - Cut logs (one flat table, product name as the leading column; the
 *     material-item grouping is not shown)
 *
 * Returns a `<style>` + `.wo-print-root` fragment to inject into the print
 * page; no `<html>`/`<body>` (those come from the Next root layout).
 */
export function buildWorkOrderSlipHtml(input: WorkOrderFileGenerationInput): string {
  const sections = [
    renderWorkOrderHeader(input),
    renderWorkOrderTopTable(input, { includeDescription: true }),
    renderWorkOrderPropertyInfo(input),
    renderWorkOrderInstallerInstructionsBlock(input),
    renderWorkOrderCutLogs(input.materialItems),
  ]
    .filter(Boolean)
    .join("\n")

  return `<style>${WO_PRINT_STYLE_BLOCK}</style>
<div class="wo-print-root">
${sections}
</div>`
}
