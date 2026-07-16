import { describe, expect, it } from "vitest"
import { resolvePrintConfig } from "../../../src/work-orders/file-generation/print-presets.js"

describe("resolvePrintConfig — merge over code base defaults", () => {
  it("an empty config resolves to the full picking-ticket base defaults", () => {
    const config = resolvePrintConfig({}, "Work Order")
    // Base = buildWorkOrderPrintConfig("pickingTicket"): all top fields + all
    // adjustment columns on, adjustments section on, material section off.
    expect(config.sections).toEqual({ adjustments: true, material: false })
    expect(Object.values(config.topFields).every(Boolean)).toBe(true)
    expect(config.adjustmentColumns).toEqual({
      dyeLot: true,
      rollNumber: true,
      converted: true,
      adjustment: true,
      location: true,
      area: true,
    })
    expect(config.materialColumns).toEqual({ notes: true })
  })

  it("sets documentLabel to the doc type's name", () => {
    expect(resolvePrintConfig({}, "Picking Ticket").documentLabel).toBe("Picking Ticket")
    expect(resolvePrintConfig({}, "Work Order").documentLabel).toBe("Work Order")
  })

  it("applies a stored partial over the base (only the named keys change)", () => {
    const config = resolvePrintConfig(
      { adjustmentColumns: { converted: false, area: false } },
      "Work Order",
    )
    expect(config.adjustmentColumns.converted).toBe(false)
    expect(config.adjustmentColumns.area).toBe(false)
    // Untouched columns keep the base default (on).
    expect(config.adjustmentColumns.dyeLot).toBe(true)
    expect(config.adjustmentColumns.rollNumber).toBe(true)
  })

  it("a key absent from the stored config falls back to the base default (flows in naturally)", () => {
    // Simulates a doc type saved before a sibling top field existed: only `date`
    // is stored, so every other top field resolves to its base default (on).
    const config = resolvePrintConfig({ topFields: { date: false } }, "Work Order")
    expect(config.topFields.date).toBe(false)
    expect(config.topFields.warehouse).toBe(true)
    expect(config.topFields.vacancy).toBe(true)
  })

  it("can turn the material section on via a stored override", () => {
    const config = resolvePrintConfig({ sections: { material: true } }, "Work Order")
    expect(config.sections).toEqual({ adjustments: true, material: true })
  })

  it("treats null/undefined stored config as empty", () => {
    expect(resolvePrintConfig(null, "X").sections).toEqual({ adjustments: true, material: false })
    expect(resolvePrintConfig(undefined, "X").sections).toEqual({
      adjustments: true,
      material: false,
    })
  })
})
