import type { WorkOrderFileGenerationInput } from "./types.js"
import {
  WO_PRINT_STYLE_BLOCK,
  renderWorkOrderCutLogs,
  renderWorkOrderPickingTicketHeader,
  renderWorkOrderTopTable,
} from "./work-order-document-sections.js"

/**
 * The "Picking Ticket" document, rendered as a self-contained HTML
 * fragment for the on-demand print view:
 *
 *   - H1 (left) + centered "Picking Ticket" tag
 *   - H2 scheduled date + the same top table as the slip, including the
 *     description row beneath Job Type
 *   - The same flat cut-log table as the slip (no Property Info)
 *
 * Returns a `<style>` + `.wo-print-root` fragment to inject into the print
 * page; no `<html>`/`<body>` (those come from the Next root layout). This
 * view is its own single page — no inter-page break wrapper.
 */
export function buildWorkOrderPickingTicketHtml(input: WorkOrderFileGenerationInput): string {
  const sections = [
    renderWorkOrderPickingTicketHeader(input),
    renderWorkOrderTopTable(input, { includeDescription: true }),
    renderWorkOrderCutLogs(input.materialItems),
  ].join("\n")

  return `<style>${WO_PRINT_STYLE_BLOCK}</style>
<div class="wo-print-root">
${sections}
</div>`
}
