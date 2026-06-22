import { describe, expect, it } from "vitest"
import {
  composeRollNumberDisplay,
  formatSignedAdjustmentMoney,
  parseInventoryDecimal,
  toInventoryFixedString,
} from "../../../src/flooring/inventory/formatters.js"

describe("parseInventoryDecimal", () => {
  it("parses a valid decimal string to a number", () => {
    expect(parseInventoryDecimal("100.5")).toBe(100.5)
    expect(parseInventoryDecimal("0")).toBe(0)
  })

  it("floors non-finite or non-numeric input to 0 (silent contract)", () => {
    expect(parseInventoryDecimal("")).toBe(0)
    expect(parseInventoryDecimal("abc")).toBe(0)
    expect(parseInventoryDecimal("Infinity")).toBe(0)
    expect(parseInventoryDecimal("NaN")).toBe(0)
  })
})

describe("toInventoryFixedString", () => {
  it("formats to a fixed two-decimal string", () => {
    expect(toInventoryFixedString(100)).toBe("100.00")
  })

  it("rounds at the .005 boundary as JS toFixed does", () => {
    // (1.005).toFixed(2) === "1.00" due to float representation — pin reality, not math.
    expect(toInventoryFixedString(1.005)).toBe("1.00")
  })
})

describe("formatSignedAdjustmentMoney", () => {
  it("prefixes + for INCREASE and − (U+2212) for DEDUCTION", () => {
    expect(formatSignedAdjustmentMoney("10.00", "INCREASE")).toBe("+$10.00")
    expect(formatSignedAdjustmentMoney("10.00", "DEDUCTION")).toBe("−$10.00")
  })

  it("normalizes the amount through the money standard", () => {
    expect(formatSignedAdjustmentMoney("10.5", "INCREASE")).toBe("+$10.50")
  })

  it("returns the placeholder '—' when the amount is absent", () => {
    expect(formatSignedAdjustmentMoney(null, "INCREASE")).toBe("—")
    expect(formatSignedAdjustmentMoney("", "DEDUCTION")).toBe("—")
  })
})

describe("composeRollNumberDisplay", () => {
  it("prefixes a non-empty trimmed suffix", () => {
    expect(composeRollNumberDisplay("ROLL#", "R-1")).toBe("ROLL#R-1")
    expect(composeRollNumberDisplay("ROLL#", "  R-1  ")).toBe("ROLL#R-1")
  })

  it("returns an empty string when the suffix is blank", () => {
    expect(composeRollNumberDisplay("ROLL#", "")).toBe("")
    expect(composeRollNumberDisplay("ROLL#", "   ")).toBe("")
  })
})
