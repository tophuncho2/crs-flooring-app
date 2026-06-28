import { buildWorkOrderPrintHtml } from "./build-work-order-print-html.js"
import { buildWorkOrderPrintConfig } from "./print-presets.js"
import type { WorkOrderFileGenerationInput } from "./types.js"

/**
 * The "Work Order Slip" preset of the work-order print document: the
 * customer-facing adjustments summary (Product · Quantity only — no inventory
 * detail columns). A thin wrapper over {@link buildWorkOrderPrintHtml}.
 */
export function buildWorkOrderSlipHtml(
  input: WorkOrderFileGenerationInput,
  options: { logoUrl?: string | null } = {},
): string {
  return buildWorkOrderPrintHtml(input, buildWorkOrderPrintConfig("slip"), options)
}
