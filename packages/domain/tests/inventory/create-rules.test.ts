import { describe, expect, it } from "vitest"
import {
  DEFAULT_ROLL_PREFIX,
  buildCreatedInventoryInsert,
  validateCreateInventoryEdits,
  type CreateInventoryEdits,
} from "../../src/inventory/create-rules.js"

function edits(overrides: Partial<CreateInventoryEdits> = {}): CreateInventoryEdits {
  return {
    productId: "p-1",
    unitId: "u-1",
    warehouseId: "wh-1",
    rollNumber: "R-2",
    dyeLot: "DYE-9",
    note: "first roll",
    startingStock: "100",
    cost: "",
    freight: "",
    location: "",
    internalNotes: "",
    coverageUnitId: "",
    coveragePerUnit: "",
    conversionFormulaId: "",
    ...overrides,
  }
}

describe("validateCreateInventoryEdits", () => {
  it("passes a complete, in-bounds form", () => {
    expect(validateCreateInventoryEdits(edits())).toEqual([])
  })

  it("flags a missing product / unit / warehouse", () => {
    expect(validateCreateInventoryEdits(edits({ productId: "  " }))).toEqual([
      { code: "PRODUCT_REQUIRED" },
    ])
    expect(validateCreateInventoryEdits(edits({ unitId: "  " }))).toEqual([
      { code: "UNIT_REQUIRED" },
    ])
    expect(validateCreateInventoryEdits(edits({ warehouseId: "" }))).toEqual([
      { code: "WAREHOUSE_REQUIRED" },
    ])
  })

  it("flags a missing / non-numeric / non-positive starting stock", () => {
    expect(validateCreateInventoryEdits(edits({ startingStock: "  " }))).toEqual([
      { code: "STARTING_STOCK_REQUIRED" },
    ])
    expect(validateCreateInventoryEdits(edits({ startingStock: "abc" }))).toEqual([
      { code: "STARTING_STOCK_INVALID" },
    ])
    expect(validateCreateInventoryEdits(edits({ startingStock: "0" }))).toEqual([
      { code: "STARTING_STOCK_NOT_POSITIVE" },
    ])
    expect(validateCreateInventoryEdits(edits({ startingStock: "-5" }))).toEqual([
      { code: "STARTING_STOCK_NOT_POSITIVE" },
    ])
  })

  it("flags over-long short-text fields (30 cap), including dye lot", () => {
    const long = "x".repeat(31)
    expect(
      validateCreateInventoryEdits(
        edits({ rollNumber: long, dyeLot: long, note: long, location: long }),
      ),
    ).toEqual([
      { code: "ROLL_NUMBER_TOO_LONG" },
      { code: "DYE_LOT_TOO_LONG" },
      { code: "NOTE_TOO_LONG" },
      { code: "LOCATION_TOO_LONG" },
    ])
  })

  it("flags over-long internal notes (250 cap)", () => {
    expect(validateCreateInventoryEdits(edits({ internalNotes: "x".repeat(251) }))).toEqual([
      { code: "INTERNAL_NOTES_TOO_LONG" },
    ])
  })

  it("accepts blank or valid cost/freight, flags malformed money", () => {
    expect(validateCreateInventoryEdits(edits({ cost: "", freight: "" }))).toEqual([])
    expect(validateCreateInventoryEdits(edits({ cost: "12.50", freight: "3" }))).toEqual([])
    expect(validateCreateInventoryEdits(edits({ cost: "abc" }))).toEqual([
      { code: "COST_INVALID" },
    ])
    expect(validateCreateInventoryEdits(edits({ freight: "-5" }))).toEqual([
      { code: "FREIGHT_INVALID" },
    ])
  })
})

describe("buildCreatedInventoryInsert", () => {
  it("stamps the unit FK, applies edits, and drops all import provenance", () => {
    const fields = buildCreatedInventoryInsert(edits())

    // No import provenance for a manual create.
    expect(fields.importEntryId).toBeNull()

    // Unit FK from the form (seeded from the product, overridable).
    expect(fields.productId).toBe("p-1")
    expect(fields.unitId).toBe("u-1")

    // Roll prefix defaults; dye lot comes from edits (not a source row).
    expect(fields.rollPrefix).toBe(DEFAULT_ROLL_PREFIX)
    expect(fields.dyeLot).toBe("DYE-9")

    // Edited fields.
    expect(fields.warehouseId).toBe("wh-1")
    expect(fields.rollNumber).toBe("R-2")
    expect(fields.note).toBe("first roll")
    expect(fields.startingStock).toBe("100")

    // Resets.
    expect(fields.netDeducted).toBe("0")
    expect(fields.isArchived).toBe(false)
  })

  it("trims the unit FK", () => {
    expect(buildCreatedInventoryInsert(edits({ unitId: " u-9 " })).unitId).toBe("u-9")
  })

  it("normalizes empty short-text fields to null", () => {
    const fields = buildCreatedInventoryInsert(
      edits({ dyeLot: "", location: "", internalNotes: "" }),
    )
    expect(fields.dyeLot).toBeNull()
    expect(fields.location).toBeNull()
    expect(fields.internalNotes).toBeNull()
  })

  it("trims the edited starting stock", () => {
    const fields = buildCreatedInventoryInsert(edits({ startingStock: " 42.50 " }))
    expect(fields.startingStock).toBe("42.50")
  })

  it("normalizes cost/freight to fixed-scale money, blank → null", () => {
    expect(buildCreatedInventoryInsert(edits({ cost: "", freight: "" })).cost).toBeNull()
    const fields = buildCreatedInventoryInsert(edits({ cost: "12.5", freight: "300" }))
    expect(fields.cost).toBe("12.50")
    expect(fields.freight).toBe("300.00")
  })
})
