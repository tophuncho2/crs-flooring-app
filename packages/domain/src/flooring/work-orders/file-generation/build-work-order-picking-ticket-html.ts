import type { WorkOrderFileGenerationInput } from "./types.js"
import {
  WO_PRINT_STYLE_BLOCK,
  renderPageFrame,
  renderWorkOrderAdjustments,
  renderWorkOrderInfo,
  renderWorkOrderPickingTicketHeader,
} from "./work-order-document-sections.js"

/**
 * The "Picking Ticket" document, rendered as a self-contained HTML
 * fragment for the on-demand print view:
 *
 *   - Header: logo (left) · centered "Picking Ticket" tag · work-order number
 *     + scheduled date (right)
 *   - The same info stack as the Slip (`renderWorkOrderInfo`)
 *   - Cut logs with full inventory detail (Product · Inventory Item · Quantity ·
 *     Adjustment · Location) — the warehouse pick view
 *
 * Returns a `<style>` + `.wo-print-root` fragment to inject into the print
 * page; no `<html>`/`<body>` (those come from the Next root layout). This
 * view is its own single page — no inter-page break wrapper.
 */
export function buildWorkOrderPickingTicketHtml(
  input: WorkOrderFileGenerationInput,
  options: { logoUrl?: string | null } = {},
): string {
  const body = [
    renderWorkOrderInfo(input),
    renderWorkOrderAdjustments(input.materialItems),
  ].join("\n")

  return `<style>${WO_PRINT_STYLE_BLOCK}</style>
<div class="wo-print-root">
${renderPageFrame(renderWorkOrderPickingTicketHeader(input, options.logoUrl), body)}
</div>`
}
