import { describe, expect, it } from "vitest"
import {
  buildReturnInventoryInsert,
  validateCreateReturnEdits,
  type CreateReturnEdits,
} from "../../src/inventory/return-rules.js"
import { DEFAULT_ROLL_PREFIX } from "../../src/inventory/create-rules.js"

function edits(overrides: Partial<CreateReturnEdits> = {}): CreateReturnEdits {
  return {
    productId: "p-1",
    unitId: "u-1",
    warehouseId: "wh-1",
    rollNumber: "R-2",
    dyeLot: "DYE-9",
    note: "first roll",
    location: "",
    coverageUnitId: "",
    coveragePerUnit: "",
    conversionFormulaId: "",
    returnedQuantity: "12",
    area: "",
    ...overrides,
  }
}

describe("validateCreateReturnEdits", () => {
  it("passes a complete, in-bounds form", () => {
    expect(validateCreateReturnEdits(edits())).toEqual([])
  })

  it("flags a missing product / unit / warehouse", () => {
    expect(validateCreateReturnEdits(edits({ productId: "  " }))).toEqual([
      { code: "PRODUCT_REQUIRED" },
    ])
    expect(validateCreateReturnEdits(edits({ unitId: "  " }))).toEqual([{ code: "UNIT_REQUIRED" }])
    expect(validateCreateReturnEdits(edits({ warehouseId: "" }))).toEqual([
      { code: "WAREHOUSE_REQUIRED" },
    ])
  })

  it("flags a missing / non-numeric / non-positive returned quantity", () => {
    expect(validateCreateReturnEdits(edits({ returnedQuantity: "  " }))).toEqual([
      { code: "RETURNED_QUANTITY_REQUIRED" },
    ])
    expect(validateCreateReturnEdits(edits({ returnedQuantity: "abc" }))).toEqual([
      { code: "RETURNED_QUANTITY_INVALID" },
    ])
    expect(validateCreateReturnEdits(edits({ returnedQuantity: "0" }))).toEqual([
      { code: "RETURNED_QUANTITY_NOT_POSITIVE" },
    ])
    expect(validateCreateReturnEdits(edits({ returnedQuantity: "-5" }))).toEqual([
      { code: "RETURNED_QUANTITY_NOT_POSITIVE" },
    ])
  })

  it("does NOT gate starting stock — a return hardcodes it '0', so a full form with a positive qty passes", () => {
    expect(validateCreateReturnEdits(edits())).toEqual([])
  })

  it("flags over-long short-text fields (30 cap), including area", () => {
    const long = "x".repeat(31)
    expect(
      validateCreateReturnEdits(
        edits({ rollNumber: long, dyeLot: long, note: long, location: long, area: long }),
      ),
    ).toEqual([
      { code: "ROLL_NUMBER_TOO_LONG" },
      { code: "DYE_LOT_TOO_LONG" },
      { code: "NOTE_TOO_LONG" },
      { code: "LOCATION_TOO_LONG" },
      { code: "AREA_TOO_LONG" },
    ])
  })

  it("flags a non-numeric coverage per unit only when present", () => {
    expect(validateCreateReturnEdits(edits({ coveragePerUnit: "" }))).toEqual([])
    expect(validateCreateReturnEdits(edits({ coveragePerUnit: "abc" }))).toEqual([
      { code: "COVERAGE_PER_UNIT_INVALID" },
    ])
  })
})

describe("buildReturnInventoryInsert", () => {
  it("hardcodes startingStock '0' + null cost/freight/internalNotes, resets the ledger, drops import provenance", () => {
    const fields = buildReturnInventoryInsert(edits())

    expect(fields.startingStock).toBe("0")
    expect(fields.cost).toBeNull()
    expect(fields.freight).toBeNull()
    expect(fields.internalNotes).toBeNull()
    expect(fields.netDeducted).toBe("0")
    expect(fields.isArchived).toBe(false)
    expect(fields.importEntryId).toBeNull()
    expect(fields.rollPrefix).toBe(DEFAULT_ROLL_PREFIX)
    expect(fields.productId).toBe("p-1")
    expect(fields.unitId).toBe("u-1")
  })

  it("normalizes empty short-text fields to null and trims the unit FK", () => {
    const fields = buildReturnInventoryInsert(
      edits({ location: "", rollNumber: "", unitId: " u-9 " }),
    )
    expect(fields.location).toBeNull()
    expect(fields.rollNumber).toBeNull()
    expect(fields.unitId).toBe("u-9")
  })
})
