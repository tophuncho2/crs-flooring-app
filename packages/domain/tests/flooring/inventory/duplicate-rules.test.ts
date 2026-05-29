import { describe, expect, it } from "vitest"
import {
  buildDuplicatedInventoryInsert,
  validateDuplicateInventoryEdits,
  type DuplicateInventoryEdits,
  type DuplicateInventorySource,
} from "../../../src/flooring/inventory/duplicate-rules.js"

function edits(overrides: Partial<DuplicateInventoryEdits> = {}): DuplicateInventoryEdits {
  return {
    rollNumber: "R-2",
    note: "second roll",
    startingStock: "100",
    location: "",
    internalNotes: "",
    ...overrides,
  }
}

function source(overrides: Partial<DuplicateInventorySource> = {}): DuplicateInventorySource {
  return {
    productId: "p-1",
    categorySlug: "carpet",
    categoryName: "Carpet",
    stockUnitName: "Square Feet",
    stockUnitAbbrev: "SF",
    itemCoverageUnitName: "",
    itemCoverageUnitAbbrev: "",
    sendUnitName: "Linear Feet",
    sendUnitAbbrev: "LF",
    coveragePerUnit: "1.50",
    rollPrefix: "ROLL#",
    dyeLot: "DYE-9",
    purchaseOrderNumber: "PO-123",
    warehouseId: "wh-1",
    ...overrides,
  }
}

describe("validateDuplicateInventoryEdits", () => {
  it("passes a positive starting stock + in-bounds text", () => {
    expect(validateDuplicateInventoryEdits(edits())).toEqual([])
  })

  it("flags a missing / non-numeric / non-positive starting stock", () => {
    expect(validateDuplicateInventoryEdits(edits({ startingStock: "  " }))).toEqual([
      { code: "STARTING_STOCK_REQUIRED" },
    ])
    expect(validateDuplicateInventoryEdits(edits({ startingStock: "abc" }))).toEqual([
      { code: "STARTING_STOCK_INVALID" },
    ])
    expect(validateDuplicateInventoryEdits(edits({ startingStock: "0" }))).toEqual([
      { code: "STARTING_STOCK_NOT_POSITIVE" },
    ])
    expect(validateDuplicateInventoryEdits(edits({ startingStock: "-5" }))).toEqual([
      { code: "STARTING_STOCK_NOT_POSITIVE" },
    ])
  })

  it("flags over-long short-text fields (30 cap)", () => {
    const long = "x".repeat(31)
    expect(
      validateDuplicateInventoryEdits(edits({ rollNumber: long, note: long, location: long })),
    ).toEqual([
      { code: "ROLL_NUMBER_TOO_LONG" },
      { code: "NOTE_TOO_LONG" },
      { code: "LOCATION_TOO_LONG" },
    ])
  })

  it("flags over-long internal notes (250 cap)", () => {
    expect(validateDuplicateInventoryEdits(edits({ internalNotes: "x".repeat(251) }))).toEqual([
      { code: "INTERNAL_NOTES_TOO_LONG" },
    ])
  })
})

describe("buildDuplicatedInventoryInsert", () => {
  it("pastes source columns (incl. PO #), applies edits, and drops the import links + import #", () => {
    const fields = buildDuplicatedInventoryInsert(source(), edits())

    // Import-entry / staged-row links + import # dropped to null.
    expect(fields.importEntryId).toBeNull()
    expect(fields.sourceStagedRowId).toBeNull()
    expect(fields.importNumber).toBeNull()

    // Pasted from source — including the PO #.
    expect(fields.purchaseOrderNumber).toBe("PO-123")
    expect(fields.productId).toBe("p-1")
    expect(fields.categorySlug).toBe("carpet")
    expect(fields.coveragePerUnit).toBe("1.50")
    expect(fields.rollPrefix).toBe("ROLL#")
    expect(fields.dyeLot).toBe("DYE-9")
    expect(fields.warehouseId).toBe("wh-1")

    // Edited fields.
    expect(fields.rollNumber).toBe("R-2")
    expect(fields.note).toBe("second roll")
    expect(fields.startingStock).toBe("100")

    // Resets.
    expect(fields.netDeducted).toBe("0")
    expect(fields.isArchived).toBe(false)
  })

  it("normalizes empty short-text + empty unit labels to null", () => {
    const fields = buildDuplicatedInventoryInsert(
      source({ itemCoverageUnitName: "", itemCoverageUnitAbbrev: "" }),
      edits({ location: "", internalNotes: "" }),
    )
    expect(fields.location).toBeNull()
    expect(fields.internalNotes).toBeNull()
    expect(fields.itemCoverageUnitName).toBeNull()
    expect(fields.itemCoverageUnitAbbrev).toBeNull()
  })

  it("trims the edited starting stock", () => {
    const fields = buildDuplicatedInventoryInsert(source(), edits({ startingStock: " 42.50 " }))
    expect(fields.startingStock).toBe("42.50")
  })
})
