import { describe, expect, it } from "vitest"
import { normalizeAdjustmentMoneyAmount } from "../../../src/inventory/adjustments/money.js"

describe("normalizeAdjustmentMoneyAmount", () => {
  it("pads to exactly three decimals (no rounding, no float)", () => {
    expect(normalizeAdjustmentMoneyAmount("10")).toBe("10.000")
    expect(normalizeAdjustmentMoneyAmount("10.5")).toBe("10.500")
    expect(normalizeAdjustmentMoneyAmount("10.25")).toBe("10.250")
    expect(normalizeAdjustmentMoneyAmount("10.333")).toBe("10.333")
    expect(normalizeAdjustmentMoneyAmount("0")).toBe("0.000")
    expect(normalizeAdjustmentMoneyAmount("007")).toBe("7.000")
  })

  it("accepts numbers and a leading plus", () => {
    expect(normalizeAdjustmentMoneyAmount(10)).toBe("10.000")
    expect(normalizeAdjustmentMoneyAmount(7.5)).toBe("7.500")
    expect(normalizeAdjustmentMoneyAmount("+3.1")).toBe("3.100")
  })

  it("rounds >3 decimals half-up exactly (defensive guard)", () => {
    expect(normalizeAdjustmentMoneyAmount("10.9995")).toBe("11.000")
    expect(normalizeAdjustmentMoneyAmount("0.0005")).toBe("0.001")
    expect(normalizeAdjustmentMoneyAmount("1.2344")).toBe("1.234")
    expect(normalizeAdjustmentMoneyAmount("1.2345")).toBe("1.235")
    expect(normalizeAdjustmentMoneyAmount("1.2346")).toBe("1.235")
    // 100 / 3 = 33.3333… → truncates down at the 3rd decimal
    expect(normalizeAdjustmentMoneyAmount(100 / 3)).toBe("33.333")
    // 200 / 3 = 66.6666… → rounds half-up at the 3rd decimal
    expect(normalizeAdjustmentMoneyAmount(200 / 3)).toBe("66.667")
    // float artifact like 0.1 + 0.2 should not leak extra precision
    expect(normalizeAdjustmentMoneyAmount(0.1 + 0.2)).toBe("0.300")
  })

  it("treats empty / garbage as absent", () => {
    expect(normalizeAdjustmentMoneyAmount("")).toBe("")
    expect(normalizeAdjustmentMoneyAmount("   ")).toBe("")
    expect(normalizeAdjustmentMoneyAmount("abc")).toBe("")
    expect(normalizeAdjustmentMoneyAmount("10.")).toBe("")
  })
})
