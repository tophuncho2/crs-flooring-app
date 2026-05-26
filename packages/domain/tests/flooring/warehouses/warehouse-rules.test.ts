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

describe("isWarehouseDeleteBlocked", () => {
  it("blocks when work orders are linked", () => {
    expect(isWarehouseDeleteBlocked({ workOrdersCount: 1 })).toBe(true)
  })

  it("allows deletion when no work orders are linked", () => {
    expect(isWarehouseDeleteBlocked({ workOrdersCount: 0 })).toBe(false)
  })
})

describe("buildWarehouseDeleteBlockedMessage", () => {
  it("explains the work-order block when work orders exist", () => {
    expect(buildWarehouseDeleteBlockedMessage({ workOrdersCount: 3 })).toBe(
      "Warehouse cannot be deleted while work orders are linked to it",
    )
  })

  it("falls back to the no-dependents message when nothing is linked", () => {
    expect(buildWarehouseDeleteBlockedMessage({ workOrdersCount: 0 })).toBe(
      "Warehouse has no linked dependents",
    )
  })
})
