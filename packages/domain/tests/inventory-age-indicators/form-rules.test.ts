import { describe, expect, it } from "vitest"
import {
  parseInventoryAgeIndicatorDays,
  validateInventoryAgeIndicatorForm,
} from "../../src/inventory-age-indicators/form-rules.js"
import {
  INVENTORY_AGE_INDICATOR_DAYS_INVALID_MESSAGE,
  INVENTORY_AGE_INDICATOR_DAYS_REQUIRED_MESSAGE,
} from "../../src/inventory-age-indicators/error-messages.js"

describe("parseInventoryAgeIndicatorDays", () => {
  it("parses a positive whole number", () => {
    expect(parseInventoryAgeIndicatorDays("30")).toBe(30)
    expect(parseInventoryAgeIndicatorDays(" 90 ")).toBe(90)
    expect(parseInventoryAgeIndicatorDays("1")).toBe(1)
  })

  it("rejects blanks, non-integers, and out-of-range values", () => {
    expect(parseInventoryAgeIndicatorDays("")).toBeNull()
    expect(parseInventoryAgeIndicatorDays("   ")).toBeNull()
    expect(parseInventoryAgeIndicatorDays("30.5")).toBeNull()
    expect(parseInventoryAgeIndicatorDays("abc")).toBeNull()
    expect(parseInventoryAgeIndicatorDays("0")).toBeNull()
    expect(parseInventoryAgeIndicatorDays("-5")).toBeNull()
    expect(parseInventoryAgeIndicatorDays("100001")).toBeNull()
  })
})

describe("validateInventoryAgeIndicatorForm", () => {
  it("returns no error for a valid form", () => {
    expect(validateInventoryAgeIndicatorForm({ days: "30", color: "GREEN" })).toBe("")
  })

  it("flags a missing days value", () => {
    expect(validateInventoryAgeIndicatorForm({ days: "", color: "GREEN" })).toBe(
      INVENTORY_AGE_INDICATOR_DAYS_REQUIRED_MESSAGE,
    )
  })

  it("flags a non-integer / out-of-range days value", () => {
    expect(validateInventoryAgeIndicatorForm({ days: "30.5", color: "GREEN" })).toBe(
      INVENTORY_AGE_INDICATOR_DAYS_INVALID_MESSAGE,
    )
    expect(validateInventoryAgeIndicatorForm({ days: "0", color: "GREEN" })).toBe(
      INVENTORY_AGE_INDICATOR_DAYS_INVALID_MESSAGE,
    )
  })
})
