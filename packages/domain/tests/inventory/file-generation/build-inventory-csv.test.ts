import { describe, expect, it } from "vitest"
import { buildInventoryCsv } from "../../../src/inventory/file-generation/build-inventory-csv.js"
import { buildInventoryPrintConfig } from "../../../src/inventory/file-generation/print-presets.js"
import { makeAdjustment, makeInventoryDetail } from "./_fixtures.js"

const BOM = "﻿"
const ADJ_LABEL = "Adjustments\r\n"

/** Split into stacked blocks: block 0 is the Field/Value record; the rest are label-prefixed. */
function blocks(csv: string): { record: string; adjustments?: string } {
  const [record, ...rest] = csv.split("\r\n\r\n")
  const result: { record: string; adjustments?: string } = { record }
  for (const block of rest) {
    if (block.startsWith(ADJ_LABEL)) result.adjustments = block.slice(ADJ_LABEL.length)
  }
  return result
}

describe("buildInventoryCsv — record block", () => {
  it("starts with a UTF-8 BOM and a Field,Value header", () => {
    const csv = buildInventoryCsv(makeInventoryDetail(), buildInventoryPrintConfig("inventoryItem"))
    expect(csv.startsWith(`${BOM}Field,Value`)).toBe(true)
  })

  it("emits one row per CHECKED inventory field via the shared manifest values", () => {
    const { record } = blocks(
      buildInventoryCsv(makeInventoryDetail(), buildInventoryPrintConfig("inventoryItem")),
    )
    expect(record).toContain("Product,Mohawk Berber - Oatmeal")
    expect(record).toContain("Roll #,ROLL#88")
    expect(record).toContain("Stock,412")
    // Cost is off by default → absent.
    expect(record).not.toContain("Cost,")
  })

  it("never emits an Inv # record row (header-only field)", () => {
    const { record } = blocks(
      buildInventoryCsv(makeInventoryDetail(), buildInventoryPrintConfig("inventoryItem")),
    )
    expect(record).not.toContain("Inv #,")
  })
})

describe("buildInventoryCsv — adjustments block", () => {
  const inventory = makeInventoryDetail({
    inventoryAdjustments: [
      makeAdjustment({ id: "a1", rollNumber: "R1" }),
      makeAdjustment({ id: "a2", rollNumber: "R2" }),
    ],
  })

  it("omits the adjustments block when the section is off", () => {
    const csv = buildInventoryCsv(inventory, buildInventoryPrintConfig("inventoryItem"))
    expect(csv).not.toContain(ADJ_LABEL)
  })

  it("emits the adjustments block, honoring row selection", () => {
    const config = {
      ...buildInventoryPrintConfig("inventoryItemAndAdjustments"),
      selectedAdjustmentIds: ["a1"],
    }
    const { adjustments } = blocks(buildInventoryCsv(inventory, config))
    expect(adjustments).toBeDefined()
    expect(adjustments).toContain("R1")
    expect(adjustments).not.toContain("R2")
  })
})
