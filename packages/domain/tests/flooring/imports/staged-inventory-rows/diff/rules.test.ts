import { describe, expect, it } from "vitest"
import { validateStagedInventoryRowsDiff } from "../../../../../src/flooring/imports/staged-inventory-rows/diff/rules.js"
import type {
  DiffExistingStagedInventoryRow,
  StagedInventoryRowsDiff,
} from "../../../../../src/flooring/imports/staged-inventory-rows/diff/types.js"

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
    isImported: false,
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

    it("emits STAGED_ROW_NOT_EDITABLE when row is IMPORTED", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        modified: [{ id: "row-1", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow({ status: "IMPORTED", isImported: true })],
      })
      expect(issues).toEqual([
        { code: "STAGED_ROW_NOT_EDITABLE", rowId: "row-1", status: "IMPORTED" },
      ])
    })

    it("emits STAGED_ROW_NOT_EDITABLE when status=DRAFT but legacy isImported latch is true", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        modified: [{ id: "row-1", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow({ status: "DRAFT", isImported: true })],
      })
      expect(issues[0]?.code).toBe("STAGED_ROW_NOT_EDITABLE")
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

    it("emits STAGED_ROW_DELETE_BLOCKED_NOT_DRAFT for IMPORTED rows", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        deleted: [{ id: "row-1" }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow({ status: "IMPORTED", isImported: true })],
      })
      expect(issues[0]?.code).toBe("STAGED_ROW_DELETE_BLOCKED_NOT_DRAFT")
    })
  })

  describe("combined", () => {
    it("collects issues across modified + deleted", () => {
      const diff: StagedInventoryRowsDiff = {
        added: [{ tempId: "tmp-1", productId: "product-1", form: form() }],
        modified: [{ id: "row-queued", form: form() }],
        deleted: [{ id: "row-imported" }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [
          existingRow({ id: "row-queued", status: "QUEUED" }),
          existingRow({ id: "row-imported", status: "IMPORTED", isImported: true }),
        ],
      })
      expect(issues.map((i) => i.code).sort()).toEqual([
        "STAGED_ROW_DELETE_BLOCKED_NOT_DRAFT",
        "STAGED_ROW_NOT_EDITABLE",
      ])
    })
  })
})
