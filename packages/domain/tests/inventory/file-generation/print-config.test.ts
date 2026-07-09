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

describe("buildInventoryPrintHtml — record only, never adjustments", () => {
  const inventory = makeInventoryDetail({
    inventoryAdjustments: [makeAdjustment(), makeAdjustment({ id: "adj-2" })],
  })

  it("renders the record block", () => {
    const html = buildInventoryPrintHtml(inventory, buildInventoryPrintConfig())
    expect(html).toContain("Inventory Item")
    expect(html).toContain('<table class="inv-primary-table">')
  })

  it("never renders an adjustments table, even when adjustments exist", () => {
    const html = buildInventoryPrintHtml(inventory, buildInventoryPrintConfig())
    // No ledger table on the printed sheet — adjustments are CSV-only.
    expect(html).not.toContain('<table class="flat-rows">')
    expect(html).not.toContain("ADJ-1")
  })
})
