import { describe, expect, it } from "vitest"
import {
  isStagedRowEditable,
  isStagedRowQueued,
  isStagedRowMaterialized,
  canDeleteStagedRow,
  canImportStagedRow,
  getStagedRowImportabilityBlocker,
  isStagedUserEditableField,
  STAGED_USER_EDITABLE_FIELDS,
  STAGED_PARENT_OWNED_FIELDS,
} from "../../../src/imports/staged-inventory-rows/editability.js"

describe("predicates", () => {
  describe("isStagedRowEditable", () => {
    it("editable in any state except QUEUED", () => {
      expect(isStagedRowEditable({ status: "DRAFT" })).toBe(true)
      // IMPORTED is editable again — a materialized staged row is pure history
      // now that the inventory->staged FK is severed.
      expect(isStagedRowEditable({ status: "IMPORTED" })).toBe(true)
      expect(isStagedRowEditable({ status: "QUEUED" })).toBe(false)
    })
  })

  describe("isStagedRowQueued / isStagedRowMaterialized", () => {
    it("isStagedRowQueued matches only QUEUED", () => {
      expect(isStagedRowQueued({ status: "QUEUED" })).toBe(true)
      expect(isStagedRowQueued({ status: "DRAFT" })).toBe(false)
      expect(isStagedRowQueued({ status: "IMPORTED" })).toBe(false)
    })

    it("isStagedRowMaterialized matches only IMPORTED", () => {
      expect(isStagedRowMaterialized({ status: "IMPORTED" })).toBe(true)
      expect(isStagedRowMaterialized({ status: "DRAFT" })).toBe(false)
      expect(isStagedRowMaterialized({ status: "QUEUED" })).toBe(false)
    })
  })

  describe("canDeleteStagedRow", () => {
    it("mirrors isStagedRowEditable (blocks only QUEUED)", () => {
      expect(canDeleteStagedRow({ status: "DRAFT" })).toBe(true)
      expect(canDeleteStagedRow({ status: "IMPORTED" })).toBe(true)
      expect(canDeleteStagedRow({ status: "QUEUED" })).toBe(false)
    })
  })
})

describe("getStagedRowImportabilityBlocker + canImportStagedRow", () => {
  const ready = {
    status: "DRAFT" as const,
    productId: "p-1",
    unitId: "u-1",
    startingStock: "5",
  }

  it("returns null for a fully ready row", () => {
    expect(getStagedRowImportabilityBlocker(ready)).toBeNull()
    expect(canImportStagedRow(ready)).toBe(true)
  })

  it("ALREADY_QUEUED takes priority", () => {
    expect(getStagedRowImportabilityBlocker({ ...ready, status: "QUEUED" })).toBe("ALREADY_QUEUED")
  })

  it("NOT_DRAFT_STATUS for IMPORTED", () => {
    expect(getStagedRowImportabilityBlocker({ ...ready, status: "IMPORTED" })).toBe("NOT_DRAFT_STATUS")
  })

  it("MISSING_PRODUCT when productId is empty or whitespace", () => {
    expect(getStagedRowImportabilityBlocker({ ...ready, productId: "" })).toBe("MISSING_PRODUCT")
    expect(getStagedRowImportabilityBlocker({ ...ready, productId: "   " })).toBe("MISSING_PRODUCT")
  })

  it("MISSING_UNIT when unitId is empty or whitespace", () => {
    expect(getStagedRowImportabilityBlocker({ ...ready, unitId: "" })).toBe("MISSING_UNIT")
    expect(getStagedRowImportabilityBlocker({ ...ready, unitId: "   " })).toBe("MISSING_UNIT")
  })

  it("ZERO_STARTING_STOCK for zero, negative, blank, or non-numeric", () => {
    for (const startingStock of ["0", "-1", "", "abc", "0.00"]) {
      expect(getStagedRowImportabilityBlocker({ ...ready, startingStock })).toBe("ZERO_STARTING_STOCK")
    }
  })

  it("canImportStagedRow only returns true when status=DRAFT AND blocker is null", () => {
    expect(canImportStagedRow({ ...ready, status: "QUEUED" })).toBe(false)
    expect(canImportStagedRow({ ...ready, status: "IMPORTED" })).toBe(false)
    expect(canImportStagedRow({ ...ready, productId: "" })).toBe(false)
  })
})

describe("field classification", () => {
  it("STAGED_USER_EDITABLE_FIELDS lists the user-editable form fields (incl. unitId)", () => {
    expect(STAGED_USER_EDITABLE_FIELDS).toEqual([
      "unitId",
      "rollNumber",
      "dyeLot",
      "location",
      "startingStock",
      "note",
    ])
  })

  it("STAGED_PARENT_OWNED_FIELDS contains warehouseId (parent-derived, not user-editable)", () => {
    expect(STAGED_PARENT_OWNED_FIELDS).toContain("warehouseId")
    expect(STAGED_PARENT_OWNED_FIELDS).toContain("productId")
    expect(STAGED_PARENT_OWNED_FIELDS).not.toContain("filterRowId")
  })

  it("isStagedUserEditableField identifies user-editable fields", () => {
    expect(isStagedUserEditableField("rollNumber")).toBe(true)
    expect(isStagedUserEditableField("warehouseId")).toBe(false)
  })
})
