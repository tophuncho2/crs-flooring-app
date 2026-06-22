import { describe, expect, it } from "vitest"
import { validateStagedInventoryForm } from "../../../../src/flooring/imports/staged-inventory-rows/form-rules.js"
import {
  STAGED_INVENTORY_ROW_DYE_LOT_MAX,
  STAGED_INVENTORY_ROW_LOCATION_MAX,
  STAGED_INVENTORY_ROW_NOTE_MAX,
  STAGED_INVENTORY_ROW_ROLL_NUMBER_MAX,
} from "../../../../src/flooring/imports/staged-inventory-rows/column-limits.js"
import type { StagedInventoryForm } from "../../../../src/flooring/imports/staged-inventory-rows/types.js"

function form(overrides: Partial<StagedInventoryForm> = {}): StagedInventoryForm {
  return {
    rollNumber: "",
    dyeLot: "",
    location: "",
    startingStock: "5",
    cost: "",
    freight: "",
    note: "",
    ...overrides,
  }
}

describe("validateStagedInventoryForm", () => {
  it("returns no issues for a valid form", () => {
    expect(validateStagedInventoryForm(form())).toEqual([])
  })

  it("flags non-numeric startingStock", () => {
    expect(validateStagedInventoryForm(form({ startingStock: "abc" })).map((i) => i.code)).toContain(
      "STAGED_STARTING_STOCK_INVALID",
    )
  })

  it("flags negative startingStock", () => {
    expect(validateStagedInventoryForm(form({ startingStock: "-1" })).map((i) => i.code)).toContain(
      "STAGED_STARTING_STOCK_NEGATIVE",
    )
  })

  it("accepts free-text fields at their max length", () => {
    expect(
      validateStagedInventoryForm(
        form({
          rollNumber: "x".repeat(STAGED_INVENTORY_ROW_ROLL_NUMBER_MAX),
          dyeLot: "x".repeat(STAGED_INVENTORY_ROW_DYE_LOT_MAX),
          location: "x".repeat(STAGED_INVENTORY_ROW_LOCATION_MAX),
          note: "x".repeat(STAGED_INVENTORY_ROW_NOTE_MAX),
        }),
      ),
    ).toEqual([])
  })

  it("flags rollNumber over the max length", () => {
    expect(
      validateStagedInventoryForm(
        form({ rollNumber: "x".repeat(STAGED_INVENTORY_ROW_ROLL_NUMBER_MAX + 1) }),
      ).map((i) => i.code),
    ).toContain("STAGED_ROLL_NUMBER_TOO_LONG")
  })

  it("flags dyeLot over the max length", () => {
    expect(
      validateStagedInventoryForm(
        form({ dyeLot: "x".repeat(STAGED_INVENTORY_ROW_DYE_LOT_MAX + 1) }),
      ).map((i) => i.code),
    ).toContain("STAGED_DYE_LOT_TOO_LONG")
  })

  it("flags location over the max length", () => {
    expect(
      validateStagedInventoryForm(
        form({ location: "x".repeat(STAGED_INVENTORY_ROW_LOCATION_MAX + 1) }),
      ).map((i) => i.code),
    ).toContain("STAGED_LOCATION_TOO_LONG")
  })

  it("flags note over the max length", () => {
    expect(
      validateStagedInventoryForm(
        form({ note: "x".repeat(STAGED_INVENTORY_ROW_NOTE_MAX + 1) }),
      ).map((i) => i.code),
    ).toContain("STAGED_NOTE_TOO_LONG")
  })

  it("accepts empty cost/freight (optional money figures)", () => {
    expect(validateStagedInventoryForm(form({ cost: "", freight: "" }))).toEqual([])
  })

  it("accepts valid cost/freight amounts", () => {
    expect(validateStagedInventoryForm(form({ cost: "12.34", freight: "5" }))).toEqual([])
  })

  it("flags an invalid cost amount", () => {
    expect(
      validateStagedInventoryForm(form({ cost: "abc" })).map((i) => i.code),
    ).toContain("STAGED_COST_INVALID")
  })

  it("flags an invalid freight amount", () => {
    expect(
      validateStagedInventoryForm(form({ freight: "1.2.3" })).map((i) => i.code),
    ).toContain("STAGED_FREIGHT_INVALID")
  })
})
