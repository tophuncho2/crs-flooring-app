import { describe, expect, it } from "vitest"
import {
  isStagedRowLocked,
  isStagedRowEditable,
  isStagedRowQueued,
  isStagedRowMaterialized,
  canDeleteStagedRow,
  canImportStagedRow,
  getStagedRowImportabilityBlocker,
  buildStagedRowNotDraftMessage,
  isStagedUserEditableField,
  isStagedLatchField,
  STAGED_USER_EDITABLE_FIELDS,
  STAGED_PARENT_OWNED_FIELDS,
  STAGED_LATCH_FIELDS,
} from "../../../../src/flooring/imports/staged-inventory-rows/editability.js"

describe("predicates", () => {
  describe("isStagedRowLocked (legacy)", () => {
    it("returns true only when isImported latch flipped", () => {
      expect(isStagedRowLocked({ isImported: true })).toBe(true)
      expect(isStagedRowLocked({ isImported: false })).toBe(false)
    })
  })

  describe("isStagedRowEditable", () => {
    it("DRAFT + !isImported → editable", () => {
      expect(isStagedRowEditable({ status: "DRAFT", isImported: false })).toBe(true)
    })

    it("DRAFT + isImported=true → not editable", () => {
      expect(isStagedRowEditable({ status: "DRAFT", isImported: true })).toBe(false)
    })

    it("QUEUED → not editable", () => {
      expect(isStagedRowEditable({ status: "QUEUED", isImported: false })).toBe(false)
    })

    it("IMPORTED → not editable", () => {
      expect(isStagedRowEditable({ status: "IMPORTED", isImported: true })).toBe(false)
    })
  })

  describe("isStagedRowQueued / isStagedRowMaterialized", () => {
    it("isStagedRowQueued matches only QUEUED", () => {
      expect(isStagedRowQueued({ status: "QUEUED", isImported: false })).toBe(true)
      expect(isStagedRowQueued({ status: "DRAFT", isImported: false })).toBe(false)
      expect(isStagedRowQueued({ status: "IMPORTED", isImported: true })).toBe(false)
    })

    it("isStagedRowMaterialized matches only IMPORTED", () => {
      expect(isStagedRowMaterialized({ status: "IMPORTED" })).toBe(true)
      expect(isStagedRowMaterialized({ status: "DRAFT" })).toBe(false)
      expect(isStagedRowMaterialized({ status: "QUEUED" })).toBe(false)
    })
  })

  describe("canDeleteStagedRow", () => {
    it("mirrors isStagedRowEditable", () => {
      expect(canDeleteStagedRow({ status: "DRAFT", isImported: false })).toBe(true)
      expect(canDeleteStagedRow({ status: "QUEUED", isImported: false })).toBe(false)
      expect(canDeleteStagedRow({ status: "IMPORTED", isImported: true })).toBe(false)
      expect(canDeleteStagedRow({ status: "DRAFT", isImported: true })).toBe(false)
    })
  })
})

describe("getStagedRowImportabilityBlocker + canImportStagedRow", () => {
  const ready = {
    status: "DRAFT" as const,
    isImported: false,
    productId: "p-1",
    unitId: "u-1",
    warehouseId: "w-1",
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
    expect(getStagedRowImportabilityBlocker({ ...ready, status: "IMPORTED", isImported: true }))
      .toBe("NOT_DRAFT_STATUS")
  })

  it("ALREADY_IMPORTED when status=DRAFT but latch is flipped", () => {
    expect(getStagedRowImportabilityBlocker({ ...ready, isImported: true })).toBe("ALREADY_IMPORTED")
  })

  it("MISSING_PRODUCT when productId is empty or whitespace", () => {
    expect(getStagedRowImportabilityBlocker({ ...ready, productId: "" })).toBe("MISSING_PRODUCT")
    expect(getStagedRowImportabilityBlocker({ ...ready, productId: "   " })).toBe("MISSING_PRODUCT")
  })

  it("MISSING_UNIT when unitId is empty or whitespace", () => {
    expect(getStagedRowImportabilityBlocker({ ...ready, unitId: "" })).toBe("MISSING_UNIT")
    expect(getStagedRowImportabilityBlocker({ ...ready, unitId: "   " })).toBe("MISSING_UNIT")
  })

  it("MISSING_WAREHOUSE when warehouseId is empty", () => {
    expect(getStagedRowImportabilityBlocker({ ...ready, warehouseId: "" })).toBe("MISSING_WAREHOUSE")
  })

  it("ZERO_STARTING_STOCK for zero, negative, blank, or non-numeric", () => {
    for (const startingStock of ["0", "-1", "", "abc", "0.00"]) {
      expect(getStagedRowImportabilityBlocker({ ...ready, startingStock })).toBe("ZERO_STARTING_STOCK")
    }
  })

  it("canImportStagedRow only returns true when status=DRAFT AND blocker is null", () => {
    expect(canImportStagedRow({ ...ready, status: "QUEUED" })).toBe(false)
    expect(canImportStagedRow({ ...ready, isImported: true })).toBe(false)
    expect(canImportStagedRow({ ...ready, productId: "" })).toBe(false)
  })
})

describe("buildStagedRowNotDraftMessage", () => {
  it("returns the queued message for QUEUED", () => {
    expect(buildStagedRowNotDraftMessage({ status: "QUEUED" })).toMatch(/queued/i)
  })

  it("returns the imported message for IMPORTED", () => {
    expect(buildStagedRowNotDraftMessage({ status: "IMPORTED" })).toMatch(/already been imported/i)
  })

  it("returns the editable message for DRAFT", () => {
    expect(buildStagedRowNotDraftMessage({ status: "DRAFT" })).toMatch(/editable/i)
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

  it("STAGED_PARENT_OWNED_FIELDS contains warehouseId (pins the immutability invariant)", () => {
    expect(STAGED_PARENT_OWNED_FIELDS).toContain("warehouseId")
    expect(STAGED_PARENT_OWNED_FIELDS).toContain("productId")
    expect(STAGED_PARENT_OWNED_FIELDS).not.toContain("filterRowId")
  })

  it("STAGED_LATCH_FIELDS contains only isImported", () => {
    expect(STAGED_LATCH_FIELDS).toEqual(["isImported"])
  })

  it("isStagedUserEditableField identifies user-editable fields", () => {
    expect(isStagedUserEditableField("rollNumber")).toBe(true)
    expect(isStagedUserEditableField("warehouseId")).toBe(false)
    expect(isStagedUserEditableField("isImported")).toBe(false)
  })

  it("isStagedLatchField identifies the latch field", () => {
    expect(isStagedLatchField("isImported")).toBe(true)
    expect(isStagedLatchField("rollNumber")).toBe(false)
  })
})
