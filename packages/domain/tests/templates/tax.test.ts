import { describe, expect, it } from "vitest"
import { computeTemplateTaxCost, isValidTaxRate, normalizeTaxRate } from "../../src/templates/tax.js"

describe("isValidTaxRate", () => {
  it("accepts 0–3 decimal percents up to 100", () => {
    for (const ok of ["0", "8", "8.25", "8.375", "100"]) {
      expect(isValidTaxRate(ok)).toBe(true)
    }
  })
  it("rejects >100, >3 decimals, negatives, blanks, and garbage", () => {
    for (const bad of ["100.001", "8.3755", "-1", "", "abc", "1000"]) {
      expect(isValidTaxRate(bad)).toBe(false)
    }
  })
})

describe("normalizeTaxRate", () => {
  it("pads to exactly scale-3 WITH the dot (the load-bearing invariant)", () => {
    expect(normalizeTaxRate("8")).toBe("8.000")
    expect(normalizeTaxRate("8.25")).toBe("8.250")
    expect(normalizeTaxRate("8.375")).toBe("8.375")
    // The `.replace(".","")` the tax math relies on must yield rate×1000:
    expect(normalizeTaxRate("8.25").replace(".", "")).toBe("8250")
    expect(normalizeTaxRate("8").replace(".", "")).toBe("8000")
  })
  it("rounds more than 3 decimals half-up", () => {
    expect(normalizeTaxRate("8.3755")).toBe("8.376")
    expect(normalizeTaxRate("8.3754")).toBe("8.375")
  })
  it("blank/garbage → ''", () => {
    expect(normalizeTaxRate("")).toBe("")
    expect(normalizeTaxRate("abc")).toBe("")
  })
})

describe("computeTemplateTaxCost", () => {
  const line = (quantity: string, bidCost: string) => ({ quantity, bidCost })

  it("applies the rate to a single taxed line total (half-up)", () => {
    // $100.00 base × 8.375% = $8.375 → $8.38
    expect(computeTemplateTaxCost([line("10", "10.00")], "8.375")).toBe("8.38")
  })
  it("sums multiple taxed lines before applying the rate", () => {
    // (10×10) + (2×25) = 150 base × 10% = 15.00
    expect(computeTemplateTaxCost([line("10", "10.00"), line("2", "25.00")], "10")).toBe("15.00")
  })
  it("blank rate → 0.00", () => {
    expect(computeTemplateTaxCost([line("10", "10.00")], "")).toBe("0.00")
  })
  it("no taxed lines → 0.00", () => {
    expect(computeTemplateTaxCost([], "8.375")).toBe("0.00")
  })
})
