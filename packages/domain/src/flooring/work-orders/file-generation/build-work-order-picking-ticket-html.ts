import type { WorkOrderFileGenerationInput } from "./types.js"
import {
  WO_PRINT_STYLE_BLOCK,
  renderWorkOrderMaterialItems,
  renderWorkOrderPickingTicketHeader,
  renderWorkOrderTopTable,
} from "./work-order-document-sections.js"

/**
 * The "Picking Ticket" document, rendered as a self-contained HTML
 * fragment for the on-demand print view:
 *
 *   - H1 + "Picking Ticket" tag in the top-right
 *   - H2 scheduled date + the same top table as the slip
 *   - The same Material Items + cut logs as the slip (no Property Info,
 *     no description)
 *
 * Returns a `<style>` + `.wo-print-root` fragment to inject into the print
 * page; no `<html>`/`<body>` (those come from the Next root layout). This
 * view is its own single page — no inter-page break wrapper.
 */
export function buildWorkOrderPickingTicketHtml(input: WorkOrderFileGenerationInput): string {
  const sections = [
    renderWorkOrderPickingTicketHeader(input),
    renderWorkOrderTopTable(input),
    renderWorkOrderMaterialItems(input.materialItems),
  ].join("\n")

  return `<style>${WO_PRINT_STYLE_BLOCK}</style>
<div class="wo-print-root">
${sections}
</div>`
}
