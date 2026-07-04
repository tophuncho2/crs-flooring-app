import { describe, expect, it } from "vitest"
import {
  computeAdjustmentMoneyShare,
  computeInventoryBalance,
} from "../../src/inventory/computed.js"

describe("computeInventoryBalance", () => {
  it("subtracts netDeducted from startingStock", () => {
    expect(computeInventoryBalance({ startingStock: "100", netDeducted: "30" })).toBe(70)
  })

  it("floors a negative balance to 0", () => {
    expect(computeInventoryBalance({ startingStock: "10", netDeducted: "25" })).toBe(0)
  })
})

describe("computeAdjustmentMoneyShare", () => {
  it("computes total × quantity / startingStock, normalized to the 3dp adjustment scale", () => {
    // 200 × 5 / 100 = 10.000
    expect(computeAdjustmentMoneyShare("200.00", "100.00", "5")).toBe("10.000")
    // 50 × 5 / 100 = 2.500
    expect(computeAdjustmentMoneyShare("50.00", "100.00", "5")).toBe("2.500")
  })

  it("returns an unsigned value (sign is derived from the adjustment type elsewhere)", () => {
    expect(computeAdjustmentMoneyShare("200.00", "100.00", "5")).toBe("10.000")
  })

  it("returns null when the total is absent", () => {
    expect(computeAdjustmentMoneyShare(null, "100.00", "5")).toBeNull()
    expect(computeAdjustmentMoneyShare("", "100.00", "5")).toBeNull()
  })

  it("returns null on a zero or garbage divisor instead of dividing", () => {
    expect(computeAdjustmentMoneyShare("200.00", "0", "5")).toBeNull()
    expect(computeAdjustmentMoneyShare("200.00", "", "5")).toBeNull()
  })

  it("carries the third decimal the shared 2dp scale would have lost", () => {
    // 100 × 1 / 3 = 33.333… → 33.333 (2dp would have given 33.33)
    expect(computeAdjustmentMoneyShare("100.00", "3", "1")).toBe("33.333")
    // 100 × 2 / 3 = 66.666… → rounds half-up at the 3rd decimal
    expect(computeAdjustmentMoneyShare("100.00", "3", "2")).toBe("66.667")
    // 100 × 1 / 8 = 12.5 exactly
    expect(computeAdjustmentMoneyShare("100.00", "8", "1")).toBe("12.500")
    // 10 × 1 / 3 = 3.333…
    expect(computeAdjustmentMoneyShare("10.00", "3", "1")).toBe("3.333")
    // 1 × 1 / 3 = 0.333…
    expect(computeAdjustmentMoneyShare("1.00", "3", "1")).toBe("0.333")
    // 2 × 1 / 3 = 0.666… → 0.667
    expect(computeAdjustmentMoneyShare("2.00", "3", "1")).toBe("0.667")
    // 100 × 1 / 7 = 14.2857… → 14.286
    expect(computeAdjustmentMoneyShare("100.00", "7", "1")).toBe("14.286")
    // 100 × 1 / 6 = 16.666… → 16.667
    expect(computeAdjustmentMoneyShare("100.00", "6", "1")).toBe("16.667")
    // whole result still pads to 3dp
    expect(computeAdjustmentMoneyShare("90.00", "9", "1")).toBe("10.000")
  })
})
