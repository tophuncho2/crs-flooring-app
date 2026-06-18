import type { WorkOrderFileGenerationInput } from "./types.js"
import {
  WO_PRINT_STYLE_BLOCK,
  renderPageFrame,
  renderWorkOrderInfo,
  renderWorkOrderMaterialItems,
  renderWorkOrderRequestedMaterialsHeader,
} from "./work-order-document-sections.js"

/**
 * The "Requested Materials" document, rendered as a self-contained HTML
 * fragment for the on-demand print view:
 *
 *   - Header: logo (left) · centered "Requested Materials" tag · work-order
 *     number (right) — identical to the Slip / Picking Ticket header
 *   - The same info stack as the Slip (`renderWorkOrderInfo`)
 *   - The work order's requested material items (Product / Qty · Unit / Notes),
 *     grouped by product with a summed-quantity subtotal per group — adjustments
 *     never appear on this view
 *
 * Returns a `<style>` + `.wo-print-root` fragment to inject into the print
 * page; no `<html>`/`<body>` (those come from the Next root layout).
 */
export function buildWorkOrderRequestedMaterialsHtml(
  input: WorkOrderFileGenerationInput,
  options: { logoUrl?: string | null } = {},
): string {
  const body = [
    renderWorkOrderInfo(input),
    renderWorkOrderMaterialItems(input.materialItemGroups),
  ]
    .filter(Boolean)
    .join("\n")

  return `<style>${WO_PRINT_STYLE_BLOCK}</style>
<div class="wo-print-root">
${renderPageFrame(renderWorkOrderRequestedMaterialsHeader(input, options.logoUrl), body)}
</div>`
}
