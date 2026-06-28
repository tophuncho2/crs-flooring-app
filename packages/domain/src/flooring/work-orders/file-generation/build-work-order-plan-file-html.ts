import { buildWorkOrderPrintHtml } from "./build-work-order-print-html.js"
import { buildWorkOrderPrintConfig } from "./print-presets.js"
import type { WorkOrderFileGenerationInput } from "./types.js"

/**
 * The "Plan File" preset of the work-order print document: the requested
 * material items (Product · Notes · Qty/Unit), grouped by product — adjustments
 * never appear here. A thin wrapper over {@link buildWorkOrderPrintHtml}.
 */
export function buildWorkOrderPlanFileHtml(
  input: WorkOrderFileGenerationInput,
  options: { logoUrl?: string | null } = {},
): string {
  return buildWorkOrderPrintHtml(input, buildWorkOrderPrintConfig("planFile"), options)
}
