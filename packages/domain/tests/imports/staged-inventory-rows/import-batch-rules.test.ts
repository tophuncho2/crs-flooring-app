import { describe, expect, it } from "vitest"
import {
  validateStagedImportBatch,
  buildStagedImportBatchIneligibleMessage,
  validateMarkForImportSelection,
  buildMarkForImportSelectionMessage,
} from "../../../src/imports/staged-inventory-rows/import-batch-rules.js"
import type { StagedInventoryRow } from "../../../src/imports/staged-inventory-rows/types.js"

type BatchRow = Pick<
  StagedInventoryRow,
  "id" | "status" | "productId" | "unitId" | "startingStock"
>

function readyRow(overrides: Partial<BatchRow> = {}): BatchRow {
  return {
    id: "row-1",
    status: "DRAFT",
    productId: "product-1",
    unitId: "unit-1",
    startingStock: "5",
    ...overrides,
  }
}

describe("validateStagedImportBatch", () => {
  it("returns no issues for a batch of ready rows", () => {
    expect(
      validateStagedImportBatch([readyRow(), readyRow({ id: "row-2" })]),
    ).toEqual([])
  })

  it("returns ALREADY_QUEUED for QUEUED rows (highest priority among status)", () => {
    expect(validateStagedImportBatch([readyRow({ status: "QUEUED" })])).toEqual([
      { rowId: "row-1", reason: "ALREADY_QUEUED" },
    ])
  })

  it("returns NOT_DRAFT_STATUS for IMPORTED rows", () => {
    expect(
      validateStagedImportBatch([readyRow({ status: "IMPORTED" })]),
    ).toEqual([{ rowId: "row-1", reason: "NOT_DRAFT_STATUS" }])
  })

  it("returns MISSING_PRODUCT when productId is empty", () => {
    expect(validateStagedImportBatch([readyRow({ productId: "" })])).toEqual([
      { rowId: "row-1", reason: "MISSING_PRODUCT" },
    ])
    expect(validateStagedImportBatch([readyRow({ productId: "   " })])).toEqual([
      { rowId: "row-1", reason: "MISSING_PRODUCT" },
    ])
  })

  it("returns ZERO_STARTING_STOCK for zero, negative, blank, or non-numeric values", () => {
    const cases: Array<BatchRow["startingStock"]> = ["0", "-1", "", "abc", "0.0"]
    for (const startingStock of cases) {
      expect(
        validateStagedImportBatch([readyRow({ startingStock })]),
      ).toEqual([{ rowId: "row-1", reason: "ZERO_STARTING_STOCK" }])
    }
  })

  describe("priority ordering when a row hits multiple blockers", () => {
    it("QUEUED beats every other reason", () => {
      const row = readyRow({
        status: "QUEUED",
        productId: "",
        startingStock: "0",
      })
      expect(validateStagedImportBatch([row])).toEqual([
        { rowId: "row-1", reason: "ALREADY_QUEUED" },
      ])
    })

    it("IMPORTED status beats missing fields", () => {
      const row = readyRow({
        status: "IMPORTED",
        productId: "",
        startingStock: "0",
      })
      expect(validateStagedImportBatch([row])).toEqual([
        { rowId: "row-1", reason: "NOT_DRAFT_STATUS" },
      ])
    })

    it("MISSING_PRODUCT beats ZERO_STARTING_STOCK", () => {
      const row = readyRow({
        productId: "",
        startingStock: "0",
      })
      expect(validateStagedImportBatch([row])).toEqual([
        { rowId: "row-1", reason: "MISSING_PRODUCT" },
      ])
    })
  })

  it("aggregates issues across multiple rows preserving order", () => {
    const issues = validateStagedImportBatch([
      readyRow({ id: "a" }),
      readyRow({ id: "b", productId: "" }),
      readyRow({ id: "c", startingStock: "0" }),
    ])
    expect(issues).toEqual([
      { rowId: "b", reason: "MISSING_PRODUCT" },
      { rowId: "c", reason: "ZERO_STARTING_STOCK" },
    ])
  })
})

describe("buildStagedImportBatchIneligibleMessage", () => {
  it("returns the all-ready message when issues is empty", () => {
    expect(buildStagedImportBatchIneligibleMessage([])).toMatch(/All staged rows are ready/)
  })

  it("names the blocker for a single missing-unit row", () => {
    const msg = buildStagedImportBatchIneligibleMessage([
      { rowId: "row-1", reason: "MISSING_UNIT" },
    ])
    expect(msg).toBe("Cannot import: 1 row with no unit of measure.")
    expect(msg).not.toContain("see per-row reasons")
  })

  it("pluralizes rows sharing one blocker", () => {
    const msg = buildStagedImportBatchIneligibleMessage([
      { rowId: "row-1", reason: "MISSING_UNIT" },
      { rowId: "row-2", reason: "MISSING_UNIT" },
    ])
    expect(msg).toBe("Cannot import: 2 rows with no unit of measure.")
  })

  it("groups a mixed batch by blocker in first-seen order", () => {
    const msg = buildStagedImportBatchIneligibleMessage([
      { rowId: "row-1", reason: "MISSING_UNIT" },
      { rowId: "row-2", reason: "MISSING_UNIT" },
      { rowId: "row-3", reason: "MISSING_PRODUCT" },
    ])
    expect(msg).toBe(
      "Cannot import: 2 rows with no unit of measure, 1 row with no product.",
    )
  })

  it("collapses NOT_DRAFT_STATUS rows under the 'already imported' label", () => {
    const msg = buildStagedImportBatchIneligibleMessage([
      { rowId: "row-1", reason: "NOT_DRAFT_STATUS" },
      { rowId: "row-2", reason: "NOT_DRAFT_STATUS" },
    ])
    expect(msg).toBe("Cannot import: 2 rows already imported.")
  })
})

describe("validateMarkForImportSelection", () => {
  it("returns no issues for a non-empty selection of real ids", () => {
    expect(validateMarkForImportSelection(["a", "b"])).toEqual([])
  })

  it("returns SELECTION_EMPTY for an empty selection", () => {
    expect(validateMarkForImportSelection([])).toEqual([{ code: "SELECTION_EMPTY" }])
  })

  it("returns SELECTION_BLANK_ID (with index) for blank ids", () => {
    expect(validateMarkForImportSelection(["a", "  ", "b", ""])).toEqual([
      { code: "SELECTION_BLANK_ID", index: 1 },
      { code: "SELECTION_BLANK_ID", index: 3 },
    ])
  })
})

describe("buildMarkForImportSelectionMessage", () => {
  it("prioritizes the empty-selection message", () => {
    expect(buildMarkForImportSelectionMessage([{ code: "SELECTION_EMPTY" }])).toMatch(
      /at least one staged row/i,
    )
  })

  it("describes a blank id", () => {
    expect(
      buildMarkForImportSelectionMessage([{ code: "SELECTION_BLANK_ID", index: 0 }]),
    ).toMatch(/blank/i)
  })
})
