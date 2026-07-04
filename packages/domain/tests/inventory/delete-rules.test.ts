import { describe, expect, it } from "vitest"
import {
  buildInventoryDeleteBlockedMessage,
  isInventoryDeleteBlocked,
} from "../../src/inventory/delete-rules.js"

describe("isInventoryDeleteBlocked", () => {
  it("is not blocked with zero inventory adjustments", () => {
    expect(isInventoryDeleteBlocked({ inventoryAdjustmentsCount: 0 })).toBe(false)
  })

  it("is blocked with one or more inventory adjustments", () => {
    expect(isInventoryDeleteBlocked({ inventoryAdjustmentsCount: 1 })).toBe(true)
    expect(isInventoryDeleteBlocked({ inventoryAdjustmentsCount: 9 })).toBe(true)
  })
})

describe("buildInventoryDeleteBlockedMessage", () => {
  it("reports the no-link case", () => {
    expect(buildInventoryDeleteBlockedMessage({ inventoryAdjustmentsCount: 0 })).toBe(
      "Inventory row has no linked inventory adjustments",
    )
  })

  it("uses singular grammar for one adjustment", () => {
    expect(buildInventoryDeleteBlockedMessage({ inventoryAdjustmentsCount: 1 })).toBe(
      "Inventory cannot be deleted while 1 inventory adjustment references it",
    )
  })

  it("uses plural grammar for many adjustments", () => {
    expect(buildInventoryDeleteBlockedMessage({ inventoryAdjustmentsCount: 3 })).toBe(
      "Inventory cannot be deleted while 3 inventory adjustments reference it",
    )
  })
})
