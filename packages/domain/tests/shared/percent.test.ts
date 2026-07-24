import { describe, expect, it } from "vitest"
import { isValidPercent, normalizePercent } from "../../src/shared/percent.js"

describe("isValidPercent", () => {
  it("accepts 0–3 decimal percents up to the default max (100)", () => {
    for (const ok of ["0", "5", "7.5", "8.375", "100"]) {
      expect(isValidPercent(ok)).toBe(true)
    }
  })
  it("rejects >max, >3 decimals, negatives, blanks, and garbage", () => {
    for (const bad of ["100.001", "8.3755", "-1", "", "abc", "1000"]) {
      expect(isValidPercent(bad)).toBe(false)
    }
  })
  it("honors a custom max", () => {
    expect(isValidPercent("50", 40)).toBe(false)
    expect(isValidPercent("40", 40)).toBe(true)
  })
})

describe("normalizePercent", () => {
  it("pads to exactly scale-3 WITH the dot (the load-bearing invariant)", () => {
    expect(normalizePercent("8")).toBe("8.000")
    expect(normalizePercent("8.25")).toBe("8.250")
    expect(normalizePercent("8.375")).toBe("8.375")
    // The `.replace(".","")` the tax/commission math relies on must yield rate×1000:
    expect(normalizePercent("8.25").replace(".", "")).toBe("8250")
    expect(normalizePercent("8").replace(".", "")).toBe("8000")
  })
  it("rounds more than 3 decimals half-up", () => {
    expect(normalizePercent("8.3755")).toBe("8.376")
    expect(normalizePercent("8.3754")).toBe("8.375")
  })
  it("blank/garbage → ''", () => {
    expect(normalizePercent("")).toBe("")
    expect(normalizePercent("abc")).toBe("")
  })
})
