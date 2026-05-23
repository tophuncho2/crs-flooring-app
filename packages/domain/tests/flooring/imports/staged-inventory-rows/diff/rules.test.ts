import { describe, expect, it } from "vitest"
import { validateStagedInventoryRowsDiff } from "../../../../../src/flooring/imports/staged-inventory-rows/diff/rules.js"
import type {
  DiffExistingStagedInventoryRow,
  StagedInventoryRowsDiff,
} from "../../../../../src/flooring/imports/staged-inventory-rows/diff/types.js"
import type { StagedInventoryFiltersDiff } from "../../../../../src/flooring/imports/staged-inventory-filter-rows/diff/types.js"

const emptyFiltersDiff: StagedInventoryFiltersDiff = {
  added: [],
  modified: [],
  deleted: [],
}

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
    filterRowId: "filter-1",
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
    it("returns no issues when parent filter row exists on the server", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        added: [{ tempId: "tmp-1", filterRowId: "filter-1", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [],
        filterDiff: emptyFiltersDiff,
        existingFilterRowIds: ["filter-1"],
      })
      expect(issues).toEqual([])
    })

    it("emits STAGED_ROW_PARENT_NOT_FOUND when parent is not on the server (unsaved-parent rule)", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        added: [{ tempId: "tmp-1", filterRowId: "filter-missing", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [],
        filterDiff: emptyFiltersDiff,
        existingFilterRowIds: [],
      })
      expect(issues).toEqual([
        {
          code: "STAGED_ROW_PARENT_NOT_FOUND",
          filterRowId: "filter-missing",
          rowTempId: "tmp-1",
          rowId: null,
        },
      ])
    })

    it("emits STAGED_ROW_PARENT_BEING_DELETED when parent is in the same-save deletes", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        added: [{ tempId: "tmp-1", filterRowId: "filter-1", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [],
        filterDiff: { added: [], modified: [], deleted: [{ id: "filter-1" }] },
        existingFilterRowIds: ["filter-1"],
      })
      expect(issues).toEqual([
        {
          code: "STAGED_ROW_PARENT_BEING_DELETED",
          filterRowId: "filter-1",
          rowTempId: "tmp-1",
          rowId: null,
        },
      ])
    })

    it("does not double-emit STAGED_ROW_PARENT_BEING_DELETED when parent is also missing (parent-not-found short-circuits)", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        added: [{ tempId: "tmp-1", filterRowId: "filter-missing", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [],
        filterDiff: { added: [], modified: [], deleted: [{ id: "filter-missing" }] },
        existingFilterRowIds: [],
      })
      expect(issues).toHaveLength(1)
      expect(issues[0]?.code).toBe("STAGED_ROW_PARENT_NOT_FOUND")
    })
  })

  describe("modified", () => {
    it("returns no issues when row exists, is DRAFT, and parent is not being deleted", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        modified: [{ id: "row-1", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow()],
        filterDiff: emptyFiltersDiff,
        existingFilterRowIds: ["filter-1"],
      })
      expect(issues).toEqual([])
    })

    it("emits STAGED_ROW_NOT_FOUND when row does not exist", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        modified: [{ id: "missing", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [],
        filterDiff: emptyFiltersDiff,
        existingFilterRowIds: [],
      })
      expect(issues).toEqual([{ code: "STAGED_ROW_NOT_FOUND", rowId: "missing" }])
    })

    it("emits STAGED_ROW_NOT_EDITABLE when row is QUEUED", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        modified: [{ id: "row-1", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow({ status: "QUEUED" })],
        filterDiff: emptyFiltersDiff,
        existingFilterRowIds: ["filter-1"],
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
        filterDiff: emptyFiltersDiff,
        existingFilterRowIds: ["filter-1"],
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
        filterDiff: emptyFiltersDiff,
        existingFilterRowIds: ["filter-1"],
      })
      expect(issues[0]?.code).toBe("STAGED_ROW_NOT_EDITABLE")
    })

    it("emits STAGED_ROW_PARENT_BEING_DELETED when row's filter row is in filters.deleted", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        modified: [{ id: "row-1", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow()],
        filterDiff: { added: [], modified: [], deleted: [{ id: "filter-1" }] },
        existingFilterRowIds: ["filter-1"],
      })
      expect(issues).toEqual([
        {
          code: "STAGED_ROW_PARENT_BEING_DELETED",
          filterRowId: "filter-1",
          rowTempId: null,
          rowId: "row-1",
        },
      ])
    })

    it("short-circuits parent-being-deleted check when row is not editable (NOT_EDITABLE wins)", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        modified: [{ id: "row-1", form: form() }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow({ status: "QUEUED" })],
        filterDiff: { added: [], modified: [], deleted: [{ id: "filter-1" }] },
        existingFilterRowIds: ["filter-1"],
      })
      expect(issues).toHaveLength(1)
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
        filterDiff: emptyFiltersDiff,
        existingFilterRowIds: ["filter-1"],
      })
      expect(issues).toEqual([])
    })

    it("emits STAGED_ROW_NOT_FOUND when row does not exist", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        deleted: [{ id: "ghost" }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [],
        filterDiff: emptyFiltersDiff,
        existingFilterRowIds: [],
      })
      expect(issues).toEqual([{ code: "STAGED_ROW_NOT_FOUND", rowId: "ghost" }])
    })

    it("emits STAGED_ROW_DELETE_BLOCKED_NOT_DRAFT for QUEUED rows", () => {
      const diff: StagedInventoryRowsDiff = {
        ...emptyRowsDiff(),
        deleted: [{ id: "row-1" }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [existingRow({ status: "QUEUED" })],
        filterDiff: emptyFiltersDiff,
        existingFilterRowIds: ["filter-1"],
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
        filterDiff: emptyFiltersDiff,
        existingFilterRowIds: ["filter-1"],
      })
      expect(issues[0]?.code).toBe("STAGED_ROW_DELETE_BLOCKED_NOT_DRAFT")
    })
  })

  describe("combined", () => {
    it("collects issues across added + modified + deleted", () => {
      const diff: StagedInventoryRowsDiff = {
        added: [{ tempId: "tmp-1", filterRowId: "missing-filter", form: form() }],
        modified: [{ id: "row-queued", form: form() }],
        deleted: [{ id: "row-imported" }],
      }
      const issues = validateStagedInventoryRowsDiff(diff, {
        existing: [
          existingRow({ id: "row-queued", status: "QUEUED" }),
          existingRow({ id: "row-imported", status: "IMPORTED", isImported: true }),
        ],
        filterDiff: emptyFiltersDiff,
        existingFilterRowIds: ["filter-1"],
      })
      expect(issues.map((i) => i.code).sort()).toEqual([
        "STAGED_ROW_DELETE_BLOCKED_NOT_DRAFT",
        "STAGED_ROW_NOT_EDITABLE",
        "STAGED_ROW_PARENT_NOT_FOUND",
      ])
    })
  })
})
