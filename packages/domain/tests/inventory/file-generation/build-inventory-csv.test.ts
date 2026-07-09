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
    const csv = buildInventoryCsv(makeInventoryDetail(), buildInventoryPrintConfig())
    expect(csv.startsWith(`${BOM}Field,Value`)).toBe(true)
  })

  it("emits one row per CHECKED inventory field via the shared manifest values", () => {
    const { record } = blocks(
      buildInventoryCsv(makeInventoryDetail(), buildInventoryPrintConfig()),
    )
    expect(record).toContain("Product,Mohawk Berber - Oatmeal")
    expect(record).toContain("Roll #,ROLL#88")
    expect(record).toContain("Stock,412")
    // Cost is off by default → absent.
    expect(record).not.toContain("Cost,")
  })

  it("never emits an Inv # record row (header-only field)", () => {
    const { record } = blocks(
      buildInventoryCsv(makeInventoryDetail(), buildInventoryPrintConfig()),
    )
    expect(record).not.toContain("Inv #,")
  })
})

describe("buildInventoryCsv — adjustments block (CSV-only)", () => {
  const inventory = makeInventoryDetail({
    inventoryAdjustments: [
      makeAdjustment({ id: "a1", rollNumber: "R1" }),
      makeAdjustment({ id: "a2", rollNumber: "R2" }),
    ],
  })

  it("includes the adjustments block by default (all rows selected)", () => {
    const config = { ...buildInventoryPrintConfig(), selectedAdjustmentIds: ["a1", "a2"] }
    const { adjustments } = blocks(buildInventoryCsv(inventory, config))
    expect(adjustments).toBeDefined()
    expect(adjustments).toContain("R1")
    expect(adjustments).toContain("R2")
  })

  it("honors row selection", () => {
    const config = { ...buildInventoryPrintConfig(), selectedAdjustmentIds: ["a1"] }
    const { adjustments } = blocks(buildInventoryCsv(inventory, config))
    expect(adjustments).toContain("R1")
    expect(adjustments).not.toContain("R2")
  })

  it("omits the block when no rows are selected (None)", () => {
    const config = { ...buildInventoryPrintConfig(), selectedAdjustmentIds: [] }
    expect(buildInventoryCsv(inventory, config)).not.toContain(ADJ_LABEL)
  })

  it("omits the block when no adjustment columns are checked", () => {
    const noColumns = Object.fromEntries(
      Object.keys(buildInventoryPrintConfig().adjustmentColumns).map((key) => [key, false]),
    )
    const config = {
      ...buildInventoryPrintConfig(),
      adjustmentColumns: noColumns,
      selectedAdjustmentIds: ["a1", "a2"],
    }
    expect(buildInventoryCsv(inventory, config)).not.toContain(ADJ_LABEL)
  })
})
