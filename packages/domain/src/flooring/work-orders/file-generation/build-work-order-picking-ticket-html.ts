import { buildWorkOrderPrintHtml } from "./build-work-order-print-html.js"
import { buildWorkOrderPrintConfig } from "./print-presets.js"
import type { WorkOrderFileGenerationInput } from "./types.js"

/**
 * The "Picking Ticket" preset of the work-order print document: adjustments with
 * full warehouse detail (Dyelot · Roll# · Adjustment · Location). A thin wrapper
 * over {@link buildWorkOrderPrintHtml} — the configurator seeds the same preset
 * and lets the user toggle from there.
 */
export function buildWorkOrderPickingTicketHtml(
  input: WorkOrderFileGenerationInput,
  options: { logoUrl?: string | null } = {},
): string {
  return buildWorkOrderPrintHtml(input, buildWorkOrderPrintConfig("pickingTicket"), options)
}
