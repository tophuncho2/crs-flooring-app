import { describe, expect, it } from "vitest"
import { buildInventoryPrintHtml } from "../../../src/inventory/file-generation/build-inventory-print-html.js"
import {
  buildInventoryPrintConfig,
  INVENTORY_DOCUMENT_LABEL,
} from "../../../src/inventory/file-generation/print-presets.js"
import { makeAdjustment, makeInventoryDetail } from "./_fixtures.js"

describe("buildInventoryPrintConfig", () => {
  it("seeds the static document label", () => {
    expect(buildInventoryPrintConfig().documentLabel).toBe(INVENTORY_DOCUMENT_LABEL)
    expect(INVENTORY_DOCUMENT_LABEL).toBe("Inventory Item")
  })

  it("seeds every available column visible by default", () => {
    const config = buildInventoryPrintConfig()
    expect(Object.values(config.inventoryColumns).every(Boolean)).toBe(true)
    expect(Object.values(config.adjustmentColumns).every(Boolean)).toBe(true)
  })

  it("excludes cost and freight from the inventory columns entirely", () => {
    const config = buildInventoryPrintConfig()
    expect(config.inventoryColumns.cost).toBeUndefined()
    expect(config.inventoryColumns.freight).toBeUndefined()
  })
})

describe("buildInventoryPrintHtml — roll tag, never adjustment data", () => {
  const inventory = makeInventoryDetail({
    inventoryAdjustments: [makeAdjustment(), makeAdjustment({ id: "adj-2" })],
  })

  it("renders the roll-tag block: Roll# heading, cells, and the blank write-in grid", () => {
    const html = buildInventoryPrintHtml(inventory, buildInventoryPrintConfig())
    expect(html).toContain("Inventory Item")
    expect(html).toContain('<div class="inv-roll-number">88</div>')
    expect(html).toContain('class="inv-cell-grid"')
    expect(html).toContain('<table class="inv-writein">')
    expect(html).toContain("<th>Adjustment</th>")
  })

  it("never renders adjustment DATA, even when adjustments exist (the grid prints blank)", () => {
    const html = buildInventoryPrintHtml(inventory, buildInventoryPrintConfig())
    // The write-in grid is a blank handwriting form — no ledger rows, no adj numbers.
    expect(html).not.toContain("ADJ-1")
    expect(html).not.toContain("ADJ-2")
  })
})
