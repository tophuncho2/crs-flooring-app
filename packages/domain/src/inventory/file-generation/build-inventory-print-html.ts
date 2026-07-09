import type { InventoryDetail } from "../types.js"
import {
  INV_PRINT_STYLE_BLOCK,
  renderInventoryAdjustments,
  renderInventoryDocumentHeader,
  renderInventoryPrimaryBlock,
  renderPageFrame,
} from "./inventory-document-sections.js"
import type { InventoryPrintConfig } from "./types.js"

/**
 * The single, checkbox-driven inventory print document. Given an
 * {@link InventoryDetail} (the existing record read — no bespoke projection) and a
 * {@link InventoryPrintConfig} (seeded from a preset, then mutated by the
 * configurator), it composes a `<style>` + `.inv-print-root` fragment: the
 * inventory record as a label/value block (always), then the adjustments ledger
 * table when `config.sections.adjustments`. `config.documentLabel` is the centered
 * top tag.
 *
 * Pure (no I/O), so it runs identically server-side and client-side (the live
 * configurator's preview + print). Returns no `<html>`/`<body>` — those come from
 * the Next root layout.
 */
export function buildInventoryPrintHtml(
  inventory: InventoryDetail,
  config: InventoryPrintConfig,
  options: { logoUrl?: string | null } = {},
): string {
  const body = [
    renderInventoryPrimaryBlock(inventory, config.inventoryColumns),
    config.sections.adjustments
      ? renderInventoryAdjustments(inventory.inventoryAdjustments, {
          columns: config.adjustmentColumns,
          selectedIds: config.selectedAdjustmentIds,
        })
      : "",
  ]
    .filter(Boolean)
    .join("\n")

  return `<style>${INV_PRINT_STYLE_BLOCK}</style>
<div class="inv-print-root">
${renderPageFrame(renderInventoryDocumentHeader(inventory, config.documentLabel, options.logoUrl), body)}
</div>`
}
