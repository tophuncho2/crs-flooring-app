import { describe, expect, it } from "vitest"
import {
  formatMoney,
  formatSignedMoney,
  isValidMoneyAmount,
  normalizeMoneyAmount,
} from "../../src/shared/money.js"

describe("isValidMoneyAmount", () => {
  it("accepts whole and 1–2 decimal non-negative amounts", () => {
    expect(isValidMoneyAmount("0")).toBe(true)
    expect(isValidMoneyAmount("10")).toBe(true)
    expect(isValidMoneyAmount("10.5")).toBe(true)
    expect(isValidMoneyAmount("10.50")).toBe(true)
    expect(isValidMoneyAmount("9999999999.99")).toBe(true) // 10 integer digits
  })

  it("rejects negatives, >2 decimals, and over-precision", () => {
    expect(isValidMoneyAmount("-1")).toBe(false)
    expect(isValidMoneyAmount("1.234")).toBe(false)
    expect(isValidMoneyAmount("10.")).toBe(false)
    expect(isValidMoneyAmount("abc")).toBe(false)
    expect(isValidMoneyAmount("")).toBe(false)
    expect(isValidMoneyAmount("12345678901.00")).toBe(false) // 11 integer digits
  })
})

describe("normalizeMoneyAmount", () => {
  it("pads to exactly two decimals (no rounding, no float)", () => {
    expect(normalizeMoneyAmount("10")).toBe("10.00")
    expect(normalizeMoneyAmount("10.5")).toBe("10.50")
    expect(normalizeMoneyAmount("10.50")).toBe("10.50")
    expect(normalizeMoneyAmount("0")).toBe("0.00")
    expect(normalizeMoneyAmount("007")).toBe("7.00")
  })

  it("accepts numbers and a leading plus", () => {
    expect(normalizeMoneyAmount(10)).toBe("10.00")
    expect(normalizeMoneyAmount(7.5)).toBe("7.50")
    expect(normalizeMoneyAmount("+3.1")).toBe("3.10")
  })

  it("rounds >2 decimals half-up exactly (defensive guard)", () => {
    expect(normalizeMoneyAmount("10.999")).toBe("11.00")
    expect(normalizeMoneyAmount("0.005")).toBe("0.01")
    expect(normalizeMoneyAmount("1.234")).toBe("1.23")
    expect(normalizeMoneyAmount("1.235")).toBe("1.24")
    // float artifact like 0.1 + 0.2 should not leak extra cents
    expect(normalizeMoneyAmount(0.1 + 0.2)).toBe("0.30")
  })

  it("treats empty / garbage as absent", () => {
    expect(normalizeMoneyAmount("")).toBe("")
    expect(normalizeMoneyAmount("   ")).toBe("")
    expect(normalizeMoneyAmount("abc")).toBe("")
  })
})

describe("formatMoney", () => {
  it("prefixes the canonical amount, default $", () => {
    expect(formatMoney("10")).toBe("$10.00")
    expect(formatMoney("10.5")).toBe("$10.50")
    expect(formatMoney(0)).toBe("$0.00")
    expect(formatMoney("1250.00", { prefix: "€" })).toBe("€1250.00")
  })

  it("returns empty for absent values so callers render their own placeholder", () => {
    expect(formatMoney("")).toBe("")
  })
})

describe("formatSignedMoney", () => {
  it("formats a non-negative value like formatMoney", () => {
    expect(formatSignedMoney("12.00")).toBe("$12.00")
    expect(formatSignedMoney("0.00")).toBe("$0.00")
    expect(formatSignedMoney("1250.00", { prefix: "€" })).toBe("€1250.00")
  })

  it("emits the U+2212 minus glyph for a negative value", () => {
    expect(formatSignedMoney("-5.00")).toBe("−$5.00")
    expect(formatSignedMoney("-1250.00", { prefix: "€" })).toBe("−€1250.00")
  })

  it("returns empty for absent values so callers render their own placeholder", () => {
    expect(formatSignedMoney("")).toBe("")
    expect(formatSignedMoney("abc")).toBe("")
  })
})
