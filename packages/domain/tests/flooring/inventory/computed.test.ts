import { describe, expect, it } from "vitest"
import {
  computeAdjustmentMoneyShare,
  computeInventoryBalance,
} from "../../../src/flooring/inventory/computed.js"

describe("computeInventoryBalance", () => {
  it("subtracts netDeducted from startingStock", () => {
    expect(computeInventoryBalance({ startingStock: "100", netDeducted: "30" })).toBe(70)
  })

  it("floors a negative balance to 0", () => {
    expect(computeInventoryBalance({ startingStock: "10", netDeducted: "25" })).toBe(0)
  })
})

describe("computeAdjustmentMoneyShare", () => {
  it("computes total × quantity / startingStock, normalized to the money scale", () => {
    // 200 × 5 / 100 = 10.00
    expect(computeAdjustmentMoneyShare("200.00", "100.00", "5")).toBe("10.00")
    // 50 × 5 / 100 = 2.50
    expect(computeAdjustmentMoneyShare("50.00", "100.00", "5")).toBe("2.50")
  })

  it("returns an unsigned value (sign is derived from the adjustment type elsewhere)", () => {
    expect(computeAdjustmentMoneyShare("200.00", "100.00", "5")).toBe("10.00")
  })

  it("returns null when the total is absent", () => {
    expect(computeAdjustmentMoneyShare(null, "100.00", "5")).toBeNull()
    expect(computeAdjustmentMoneyShare("", "100.00", "5")).toBeNull()
  })

  it("returns null on a zero or garbage divisor instead of dividing", () => {
    expect(computeAdjustmentMoneyShare("200.00", "0", "5")).toBeNull()
    expect(computeAdjustmentMoneyShare("200.00", "", "5")).toBeNull()
  })

  it("rounds half-up at the money scale", () => {
    // 100 × 1 / 3 = 33.333… → 33.33
    expect(computeAdjustmentMoneyShare("100.00", "3", "1")).toBe("33.33")
  })
})
