import type { WorkOrderFileGenerationInput } from "./types.js"
import {
  WO_PRINT_STYLE_BLOCK,
  renderPageFrame,
  renderWorkOrderAdjustments,
  renderWorkOrderHeader,
  renderWorkOrderInfo,
} from "./work-order-document-sections.js"

/**
 * The "Work Order Slip" document, rendered as a self-contained HTML
 * fragment for the on-demand print view (the canonical work-order page
 * since the file-generation worker was retired):
 *
 *   - Header: logo (left) · centered "Work Order" tag · work-order number +
 *     scheduled date (right)
 *   - Info stack (`renderWorkOrderInfo`, shared with the Picking Ticket):
 *     Warehouse / Job Type / Description / Management Company / Property (with
 *     flat address beneath) / Unit Type / Unit Number / Vacancy / Property
 *     Instructions / Installer Instructions
 *   - Cut logs (slip variant: Product / Quantity only — no inventory
 *     item / adjustment / location columns)
 *
 * Returns a `<style>` + `.wo-print-root` fragment to inject into the print
 * page; no `<html>`/`<body>` (those come from the Next root layout).
 */
export function buildWorkOrderSlipHtml(
  input: WorkOrderFileGenerationInput,
  options: { logoUrl?: string | null } = {},
): string {
  const body = [
    renderWorkOrderInfo(input),
    renderWorkOrderAdjustments(input.materialItems, { includeInventoryDetail: false }),
  ]
    .filter(Boolean)
    .join("\n")

  return `<style>${WO_PRINT_STYLE_BLOCK}</style>
<div class="wo-print-root">
${renderPageFrame(renderWorkOrderHeader(input, options.logoUrl), body)}
</div>`
}
