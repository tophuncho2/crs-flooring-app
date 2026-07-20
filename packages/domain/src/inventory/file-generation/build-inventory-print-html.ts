import type { InventoryDetail } from "../types.js"
import {
  INV_PRINT_STYLE_BLOCK,
  renderInventoryDocumentHeader,
  renderInventoryPrimaryBlock,
  renderInventoryWriteInGrid,
  renderPageFrame,
} from "./inventory-document-sections.js"
import type { InventoryPrintConfig } from "./types.js"

/**
 * The inventory print document — a physical ROLL TAG. Given an {@link InventoryDetail}
 * (the existing record read — no bespoke projection) and an {@link InventoryPrintConfig},
 * it composes a `<style>` + `.inv-print-root` fragment: the big Roll# heading + a
 * small label/value cell grid of the checked print cells, then a BLANK write-in
 * grid (Date · Adjustment · Balance) the operator fills in by hand — all under the
 * repeating page header. The adjustments DATA ledger is intentionally NOT printed
 * (it would overflow any sheet — it exports to CSV instead); the printed grid is a
 * blank handwriting form, not that ledger. `config.documentLabel` is the centered top tag.
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
  const body = `${renderInventoryPrimaryBlock(inventory, config.inventoryColumns)}
${renderInventoryWriteInGrid()}`

  return `<style>${INV_PRINT_STYLE_BLOCK}</style>
<div class="inv-print-root">
${renderPageFrame(renderInventoryDocumentHeader(inventory, config.documentLabel, options.logoUrl), body)}
</div>`
}
