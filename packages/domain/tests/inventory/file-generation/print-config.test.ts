import { describe, expect, it } from "vitest"
import { buildInventoryPrintHtml } from "../../../src/inventory/file-generation/build-inventory-print-html.js"
import {
  applyInventoryDocumentLabel,
  buildInventoryPrintConfig,
  INVENTORY_DOCUMENT_LABELS,
} from "../../../src/inventory/file-generation/print-presets.js"
import { makeAdjustment, makeInventoryDetail } from "./_fixtures.js"

describe("presets seed the right document", () => {
  it("inventoryItem → adjustments section OFF, record-only title", () => {
    const config = buildInventoryPrintConfig("inventoryItem")
    expect(config.sections).toEqual({ adjustments: false })
    expect(config.documentLabel).toBe("Inventory Item")
  })

  it("inventoryItemAndAdjustments → adjustments section ON", () => {
    const config = buildInventoryPrintConfig("inventoryItemAndAdjustments")
    expect(config.sections).toEqual({ adjustments: true })
    expect(config.documentLabel).toBe("Inventory Item & Adjustments")
  })

  it("document-type labels mirror the two preset documentLabels", () => {
    expect(INVENTORY_DOCUMENT_LABELS).toEqual([
      buildInventoryPrintConfig("inventoryItem").documentLabel,
      buildInventoryPrintConfig("inventoryItemAndAdjustments").documentLabel,
    ])
  })
})

describe("applyInventoryDocumentLabel — label switch toggles the section", () => {
  it("switching to '& Adjustments' turns the section on and sets the title", () => {
    const next = applyInventoryDocumentLabel(
      buildInventoryPrintConfig("inventoryItem"),
      "Inventory Item & Adjustments",
    )
    expect(next.documentLabel).toBe("Inventory Item & Adjustments")
    expect(next.sections.adjustments).toBe(true)
  })

  it("switching back to 'Inventory Item' turns the section off", () => {
    const next = applyInventoryDocumentLabel(
      buildInventoryPrintConfig("inventoryItemAndAdjustments"),
      "Inventory Item",
    )
    expect(next.documentLabel).toBe("Inventory Item")
    expect(next.sections.adjustments).toBe(false)
  })

  it("preserves the user's column + row selections across the switch", () => {
    const seed = buildInventoryPrintConfig("inventoryItem")
    const edited = {
      ...seed,
      inventoryColumns: { ...seed.inventoryColumns, cost: true },
      selectedAdjustmentIds: ["adj-1"],
    }
    const next = applyInventoryDocumentLabel(edited, "Inventory Item & Adjustments")
    expect(next.inventoryColumns.cost).toBe(true)
    expect(next.selectedAdjustmentIds).toEqual(["adj-1"])
  })
})

describe("buildInventoryPrintHtml — section gating", () => {
  const inventory = makeInventoryDetail({
    inventoryAdjustments: [makeAdjustment()],
  })

  it("inventoryItem renders the primary block only (no adjustments table)", () => {
    const html = buildInventoryPrintHtml(inventory, buildInventoryPrintConfig("inventoryItem"))
    expect(html).toContain("Inventory Item")
    expect(html).toContain('<table class="inv-primary-table">')
    // The `.flat-rows` CSS lives in the style block always — assert on the TABLE.
    expect(html).not.toContain('<table class="flat-rows">')
  })

  it("inventoryItemAndAdjustments renders the adjustments table too", () => {
    const html = buildInventoryPrintHtml(
      inventory,
      buildInventoryPrintConfig("inventoryItemAndAdjustments"),
    )
    expect(html).toContain("Inventory Item &amp; Adjustments")
    expect(html).toContain('<table class="inv-primary-table">')
    expect(html).toContain('<table class="flat-rows">')
  })
})
