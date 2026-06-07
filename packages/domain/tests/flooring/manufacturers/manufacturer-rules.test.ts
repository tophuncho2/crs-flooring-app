import { describe, expect, it } from "vitest"
import {
  isManufacturerCompanyNameConflict,
  normalizeManufacturerCompanyNameForUniqueness,
} from "../../../src/flooring/manufacturers/manufacturer-rules.js"

describe("normalizeManufacturerCompanyNameForUniqueness", () => {
  it("trims and lower-cases the company name", () => {
    expect(normalizeManufacturerCompanyNameForUniqueness("  Shaw Floors  ")).toBe("shaw floors")
  })

  it("collapses case so equivalent names normalize alike", () => {
    expect(normalizeManufacturerCompanyNameForUniqueness("MOHAWK")).toBe(
      normalizeManufacturerCompanyNameForUniqueness("mohawk"),
    )
  })
})

describe("isManufacturerCompanyNameConflict", () => {
  it("passes through the existence flag", () => {
    expect(isManufacturerCompanyNameConflict(true)).toBe(true)
    expect(isManufacturerCompanyNameConflict(false)).toBe(false)
  })
})
