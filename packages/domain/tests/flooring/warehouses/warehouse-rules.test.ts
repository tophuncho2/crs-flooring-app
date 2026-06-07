import { describe, expect, it } from "vitest"
import {
  buildWarehouseDeleteBlockedMessage,
  isWarehouseDeleteBlocked,
  isWarehouseNameConflict,
  normalizeWarehouseName,
} from "../../../src/flooring/warehouses/warehouse-rules.js"

describe("normalizeWarehouseName", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeWarehouseName("  Main Depot  ")).toBe("Main Depot")
  })

  it("preserves internal casing and spacing", () => {
    expect(normalizeWarehouseName("North  WAREHOUSE")).toBe("North  WAREHOUSE")
  })
})

describe("isWarehouseNameConflict", () => {
  it("is true for names that differ only by case and surrounding whitespace", () => {
    expect(isWarehouseNameConflict("Main Depot", "  main depot ")).toBe(true)
  })

  it("is false for genuinely different names", () => {
    expect(isWarehouseNameConflict("Main Depot", "South Depot")).toBe(false)
  })
})

const NO_DEPENDENTS = {
  inventoriesCount: 0,
  importsCount: 0,
  stagedInventoryRowsCount: 0,
  inventoryAdjustmentsCount: 0,
  workOrdersCount: 0,
  templatesCount: 0,
}

describe("isWarehouseDeleteBlocked", () => {
  it.each([
    ["inventory", { ...NO_DEPENDENTS, inventoriesCount: 1 }],
    ["imports", { ...NO_DEPENDENTS, importsCount: 1 }],
    ["staged inventory rows", { ...NO_DEPENDENTS, stagedInventoryRowsCount: 1 }],
    ["adjustments", { ...NO_DEPENDENTS, inventoryAdjustmentsCount: 1 }],
    ["work orders", { ...NO_DEPENDENTS, workOrdersCount: 1 }],
    ["templates", { ...NO_DEPENDENTS, templatesCount: 1 }],
  ])("blocks when %s are linked", (_label, counts) => {
    expect(isWarehouseDeleteBlocked(counts)).toBe(true)
  })

  it("allows deletion when nothing is linked", () => {
    expect(isWarehouseDeleteBlocked(NO_DEPENDENTS)).toBe(false)
  })
})

describe("buildWarehouseDeleteBlockedMessage", () => {
  it("lists a single linked dependent", () => {
    expect(buildWarehouseDeleteBlockedMessage({ ...NO_DEPENDENTS, workOrdersCount: 3 })).toBe(
      "Warehouse cannot be deleted while it has linked: work orders",
    )
  })

  it("lists multiple linked dependents in reading order", () => {
    expect(
      buildWarehouseDeleteBlockedMessage({
        ...NO_DEPENDENTS,
        inventoriesCount: 2,
        workOrdersCount: 1,
        templatesCount: 4,
      }),
    ).toBe("Warehouse cannot be deleted while it has linked: inventory, work orders, templates")
  })

  it("falls back to the no-dependents message when nothing is linked", () => {
    expect(buildWarehouseDeleteBlockedMessage(NO_DEPENDENTS)).toBe(
      "Warehouse has no linked dependents",
    )
  })
})
