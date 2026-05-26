import { describe, expect, it } from "vitest"
import {
  isPropertyNameConflict,
  normalizePropertyNameForUniqueness,
} from "../../../src/management/properties/property-rules.js"

describe("normalizePropertyNameForUniqueness", () => {
  it("lower-cases the name", () => {
    expect(normalizePropertyNameForUniqueness("Maple Court")).toBe("maple court")
  })

  it("trims surrounding whitespace", () => {
    expect(normalizePropertyNameForUniqueness("  Maple Court  ")).toBe("maple court")
  })

  it("trims and lower-cases together", () => {
    expect(normalizePropertyNameForUniqueness("  MAPLE court ")).toBe("maple court")
  })

  it("leaves an already-normalized name unchanged", () => {
    expect(normalizePropertyNameForUniqueness("maple court")).toBe("maple court")
  })
})

describe("isPropertyNameConflict", () => {
  it("returns true when the normalized name already exists", () => {
    expect(isPropertyNameConflict(true)).toBe(true)
  })

  it("returns false when the normalized name is free", () => {
    expect(isPropertyNameConflict(false)).toBe(false)
  })
})
