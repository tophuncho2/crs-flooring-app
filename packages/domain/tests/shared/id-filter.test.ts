import { describe, expect, it } from "vitest"
import { normalizeIdFilter } from "../../src/shared/id-filter.js"

describe("normalizeIdFilter", () => {
  it("returns undefined for undefined input", () => {
    expect(normalizeIdFilter(undefined)).toBeUndefined()
  })

  it("returns undefined for an empty array", () => {
    expect(normalizeIdFilter([])).toBeUndefined()
  })

  it("trims entries and drops blanks", () => {
    expect(normalizeIdFilter([" a ", "b", "  "])).toEqual(["a", "b"])
  })

  it("de-duplicates while preserving first-seen order", () => {
    expect(normalizeIdFilter(["b", "a", "b", "c"])).toEqual(["b", "a", "c"])
  })

  it("returns undefined when nothing survives", () => {
    expect(normalizeIdFilter(["", "   "])).toBeUndefined()
  })
})
