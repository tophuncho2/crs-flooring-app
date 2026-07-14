import { describe, expect, it } from "vitest"
import {
  computeAdjustmentMoneyShare,
  computeInventoryBalance,
  convertQuantity,
  type ConversionFormulaInput,
} from "../../src/inventory/computed.js"

const SQFT = "unit-sqft"
const LINFT = "unit-linft"

// Planks: sq ft → boxes, DIVIDE by the row's own coveragePerUnit (20 sq ft/box).
const PLANK_FORMULA: ConversionFormulaInput = {
  fromUnitId: SQFT,
  operator: "DIVIDE",
  factorMode: "USE_COVERAGE_PER_UNIT",
  constantFactor: null,
}
// Carpet: linear ft → sq yd, MULTIPLY by a constant 1.333 (never reads coverage).
const CARPET_FORMULA: ConversionFormulaInput = {
  fromUnitId: LINFT,
  operator: "MULTIPLY",
  factorMode: "CONSTANT",
  constantFactor: "1.333",
}

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

describe("convertQuantity", () => {
  it("divides by the row's coveragePerUnit (planks: 100 sq ft ÷ 20 = 5 boxes)", () => {
    expect(
      convertQuantity({
        balance: "100",
        rowUnitId: SQFT,
        coveragePerUnit: "20",
        formula: PLANK_FORMULA,
      }),
    ).toBe("5.00")
  })

  it("multiplies by the constant factor, ignoring coveragePerUnit (carpet ×1.333)", () => {
    expect(
      convertQuantity({
        balance: "100",
        rowUnitId: LINFT,
        // A stray coveragePerUnit must NOT be read in CONSTANT mode.
        coveragePerUnit: "999",
        formula: CARPET_FORMULA,
      }),
    ).toBe("133.30")
  })

  it("returns '' when there is no formula", () => {
    expect(
      convertQuantity({ balance: "100", rowUnitId: SQFT, coveragePerUnit: "20", formula: null }),
    ).toBe("")
  })

  it("returns '' when the row's own unit does not match the formula's source unit", () => {
    // The row is in linear ft but points at the sq-ft plank formula — source guard.
    expect(
      convertQuantity({
        balance: "100",
        rowUnitId: LINFT,
        coveragePerUnit: "20",
        formula: PLANK_FORMULA,
      }),
    ).toBe("")
  })

  it("returns '' when the rowUnitId is missing", () => {
    expect(
      convertQuantity({ balance: "100", rowUnitId: null, coveragePerUnit: "20", formula: PLANK_FORMULA }),
    ).toBe("")
  })

  it("returns '' on a blank or zero coveragePerUnit in USE_COVERAGE_PER_UNIT mode (no divide-by-zero)", () => {
    expect(
      convertQuantity({ balance: "100", rowUnitId: SQFT, coveragePerUnit: "", formula: PLANK_FORMULA }),
    ).toBe("")
    expect(
      convertQuantity({ balance: "100", rowUnitId: SQFT, coveragePerUnit: "0", formula: PLANK_FORMULA }),
    ).toBe("")
  })

  it("returns '' when a CONSTANT formula has a blank constant factor", () => {
    expect(
      convertQuantity({
        balance: "100",
        rowUnitId: LINFT,
        coveragePerUnit: null,
        formula: { ...CARPET_FORMULA, constantFactor: null },
      }),
    ).toBe("")
  })
})
