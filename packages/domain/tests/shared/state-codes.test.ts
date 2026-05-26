import { describe, expect, it } from "vitest"
import { normalizeStateCodeFilter } from "../../src/shared/state-codes.js"

describe("normalizeStateCodeFilter", () => {
  it("returns undefined for undefined input", () => {
    expect(normalizeStateCodeFilter(undefined)).toBeUndefined()
  })

  it("returns undefined for an empty array", () => {
    expect(normalizeStateCodeFilter([])).toBeUndefined()
  })

  it("trims and upper-cases valid codes", () => {
    expect(normalizeStateCodeFilter([" ca ", "ny"])).toEqual(["CA", "NY"])
  })

  it("drops entries that are not exactly two letters", () => {
    expect(normalizeStateCodeFilter(["CA", "C", "CAL", "1A", "C1", ""])).toEqual(["CA"])
  })

  it("de-duplicates after normalization", () => {
    expect(normalizeStateCodeFilter(["ca", "CA", " Ca "])).toEqual(["CA"])
  })

  it("returns undefined when every entry is invalid", () => {
    expect(normalizeStateCodeFilter(["123", "x", ""])).toBeUndefined()
  })

  it("preserves first-seen order of distinct codes", () => {
    expect(normalizeStateCodeFilter(["ny", "ca", "ny", "tx"])).toEqual(["NY", "CA", "TX"])
  })
})
