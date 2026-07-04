import type { WorkOrderFileGenerationInput, WorkOrderPrintConfig } from "./types.js"
import {
  WO_PRINT_STYLE_BLOCK,
  renderPageFrame,
  renderWorkOrderAdjustments,
  renderWorkOrderDocumentHeader,
  renderWorkOrderInfo,
  renderWorkOrderMaterialItems,
} from "./work-order-document-sections.js"

/**
 * The single, checkbox-driven work-order print document. Given a
 * {@link WorkOrderPrintConfig} (seeded from a preset, then mutated by the
 * configurator's checkboxes), it composes the same `<style>` + `.wo-print-root`
 * fragment the three legacy builders produced — the top info stack gated by
 * `config.topFields`, and ONE mutually-exclusive bottom section: adjustments
 * (with per-column detail) or requested material. `config.documentLabel` is the
 * centered top tag, the one part that differs between the presets.
 *
 * Pure (no I/O), so it runs identically server-side (the legacy preset wrappers)
 * and client-side (the live configurator's preview + print). Returns no
 * `<html>`/`<body>` — those come from the Next root layout.
 */
export function buildWorkOrderPrintHtml(
  input: WorkOrderFileGenerationInput,
  config: WorkOrderPrintConfig,
  options: { logoUrl?: string | null } = {},
): string {
  const bottom =
    config.mode === "material"
      ? renderWorkOrderMaterialItems(input.materialItemGroups, {
          columns: config.materialColumns,
          selectedIds: config.selectedMaterialIds,
        })
      : renderWorkOrderAdjustments(input.adjustmentGroups, {
          columns: config.adjustmentColumns,
          selectedIds: config.selectedAdjustmentIds,
        })
  const body = [renderWorkOrderInfo(input, config.topFields), bottom].filter(Boolean).join("\n")

  return `<style>${WO_PRINT_STYLE_BLOCK}</style>
<div class="wo-print-root">
${renderPageFrame(renderWorkOrderDocumentHeader(input, config.documentLabel, options.logoUrl), body)}
</div>`
}
