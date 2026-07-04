import { describe, expect, it } from "vitest"
import { validateStagedInventoryRowsDiff } from "../../../../src/imports/staged-inventory-rows/diff/rules.js"
import type {
  DiffExistingStagedInventoryRow,
  StagedInventoryRowsDiff,
} from "../../../../src/imports/staged-inventory-rows/diff/types.js"

function form(overrides: Partial<{ rollNumber: string; dyeLot: string; location: string; startingStock: string; note: string }> = {}) {
  return {
    rollNumber: "",
    dyeLot: "",
    location: "",
    startingStock: "1",
    note: "",
    ...overrides,
  }
}

function existingRow(
  overrides: Partial<DiffExistingStagedInventoryRow> = {},
): DiffExistingStagedInventoryRow {
  return {
    id: "row-1",
    status: "DRAFT",
    ...overrides,
  }
}

function emptyRowsDiff(): StagedInventoryRowsDiff {
  return { added: [], modified: [], deleted: [] }
}

describe("validateStagedInventoryRowsDiff", () => {
  describe("added", () => {
    it("returns no issues for added rows (they attach to the import directly)", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        added: [{ tempId: "tmp-1", productId: "product-1", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, { existing: [] })
      expect(issues).toEqual([])
    })
  })

  describe("modified", () => {
    it("returns no issues when row exists and is DRAFT", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        modified: [{ id: "row-1", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow()],
      })
      expect(issues).toEqual([])
    })

    it("emits STAGED_ROW_NOT_FOUND when row does not exist", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        modified: [{ id: "missing", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, { existing: [] })
      expect(issues).toEqual([{ code: "STAGED_ROW_NOT_FOUND", rowId: "missing" }])
    })

    it("emits STAGED_ROW_NOT_EDITABLE when row is QUEUED", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        modified: [{ id: "row-1", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow({ status: "QUEUED" })],
      })
      expect(issues).toEqual([
        { code: "STAGED_ROW_NOT_EDITABLE", rowId: "row-1", status: "QUEUED" },
      ])
    })

    it("returns no issues when row is IMPORTED (editable again — the FK was severed)", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        modified: [{ id: "row-1", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow({ status: "IMPORTED" })],
      })
      expect(issues).toEqual([])
    })
  })

  describe("deleted", () => {
    it("returns no issues when row exists and is DRAFT-deletable", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        deleted: [{ id: "row-1" }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow()],
      })
      expect(issues).toEqual([])
    })

    it("emits STAGED_ROW_NOT_FOUND when row does not exist", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        deleted: [{ id: "ghost" }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, { existing: [] })
      expect(issues).toEqual([{ code: "STAGED_ROW_NOT_FOUND", rowId: "ghost" }])
    })

    it("emits STAGED_ROW_DELETE_BLOCKED_NOT_DRAFT for QUEUED rows", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        deleted: [{ id: "row-1" }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow({ status: "QUEUED" })],
      })
      expect(issues).toEqual([
        {
          code: "STAGED_ROW_DELETE_BLOCKED_NOT_DRAFT",
          rowId: "row-1",
          status: "QUEUED",
        },
      ])
    })

    it("returns no issues when deleting an IMPORTED row (deletable again — pure history)", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        deleted: [{ id: "row-1" }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow({ status: "IMPORTED" })],
      })
      expect(issues).toEqual([])
    })
  })

  describe("combined", () => {
    it("collects issues across modified + deleted (only QUEUED rows block)", () => {
      const diff: StagedInventoryRowsDiff = {
        added: [{ tempId: "tmp-1", productId: "product-1", form: form() }],
        modified: [{ id: "row-queued-a", form: form() }],
        deleted: [{ id: "row-queued-b" }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [
          existingRow({ id: "row-queued-a", status: "QUEUED" }),
          existingRow({ id: "row-queued-b", status: "QUEUED" }),
        ],
      })
      expect(issues.map((i) => i.code).sort()).toEqual([
        "STAGED_ROW_DELETE_BLOCKED_NOT_DRAFT",
        "STAGED_ROW_NOT_EDITABLE",
      ])
    })
  })
})
