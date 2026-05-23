import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getImportByIdMock,
  getProductByIdMock,
  listFilterRowDiffSummariesByImportMock,
  listStagedInventoryRowDiffSummariesByImportMock,
  applyImportStagedInventorySectionDiffMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  getImportByIdMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  listFilterRowDiffSummariesByImportMock: vi.fn(),
  listStagedInventoryRowDiffSummariesByImportMock: vi.fn(),
  applyImportStagedInventorySectionDiffMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
  },
  withDatabaseTransaction: withDatabaseTransactionMock,
  getImportById: getImportByIdMock,
  getProductById: getProductByIdMock,
  listFilterRowDiffSummariesByImport: listFilterRowDiffSummariesByImportMock,
  listStagedInventoryRowDiffSummariesByImport: listStagedInventoryRowDiffSummariesByImportMock,
  applyImportStagedInventorySectionDiff: applyImportStagedInventorySectionDiffMock,
}))

import { saveImportStagedInventorySectionUseCase } from "../../../src/flooring/imports/staged-inventory-section/save-import-staged-inventory-section.js"
import { ImportStagedInventorySectionExecutionError } from "../../../src/flooring/imports/staged-inventory-section/errors.js"
import type { SaveImportStagedInventorySectionInput } from "../../../src/flooring/imports/staged-inventory-section/types.js"

const IMPORT_ID = "import-1"
const WAREHOUSE_ID = "wh-import"

type FilterForm = {
  categoryFilterId: string | null
  productId: string
  stockOrdered: string
}
type RowForm = {
  rollNumber: string
  dyeLot: string
  location: string
  startingStock: string
  note: string
}

function filterForm(overrides: Partial<FilterForm> = {}): FilterForm {
  return {
    categoryFilterId: "cat-1",
    productId: "product-1",
    stockOrdered: "10",
    ...overrides,
  }
}
function rowForm(overrides: Partial<RowForm> = {}): RowForm {
  return {
    rollNumber: "",
    dyeLot: "",
    location: "",
    startingStock: "5",
    note: "",
    ...overrides,
  }
}

function emptyInput(overrides: Partial<SaveImportStagedInventorySectionInput["diff"]> = {}): SaveImportStagedInventorySectionInput {
  return {
    importEntryId: IMPORT_ID,
    diff: {
      filters: { added: [], modified: [], deleted: [] },
      rows: { added: [], modified: [], deleted: [] },
      ...overrides,
    },
  }
}

function fakeImport() {
  return {
    id: IMPORT_ID,
    importNumber: 1,
    purchaseOrderNumber: "PO-1",
    warehouseId: WAREHOUSE_ID,
    warehouseName: "Main",
    manufacturerId: "mfr-1",
    manufacturerName: "Acme",
    internalNotes: "",
    stagedInventoryRowsCount: 0,
    liveInventoryRowsCount: 0,
    createdAt: "2026-05-22T00:00:00.000Z",
    updatedAt: "2026-05-22T00:00:00.000Z",
  }
}

function fakeProduct(overrides: Record<string, unknown> = {}) {
  // Shape relevant to the use case: only stockUnitName / stockUnitAbbrev
  // are read.
  return {
    id: "product-1",
    stockUnitName: "Square Yard",
    stockUnitAbbrev: "sy",
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getImportByIdMock.mockReset()
  getProductByIdMock.mockReset()
  listFilterRowDiffSummariesByImportMock.mockReset()
  listStagedInventoryRowDiffSummariesByImportMock.mockReset()
  applyImportStagedInventorySectionDiffMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ $queryRaw: vi.fn().mockResolvedValue([]) }),
  )

  getImportByIdMock.mockResolvedValue(fakeImport())
  listFilterRowDiffSummariesByImportMock.mockResolvedValue([])
  listStagedInventoryRowDiffSummariesByImportMock.mockResolvedValue([])
  applyImportStagedInventorySectionDiffMock.mockResolvedValue({
    filterRows: [],
    stagedRows: [],
    filterTempIdMap: {},
    rowTempIdMap: {},
  })
})

describe("saveImportStagedInventorySectionUseCase — parent locking", () => {
  it("throws SECTION_PARENT_NOT_FOUND (404) when the import does not exist", async () => {
    getImportByIdMock.mockResolvedValue(null)
    try {
      await saveImportStagedInventorySectionUseCase(emptyInput())
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportStagedInventorySectionExecutionError)) throw error
      expect(error.code).toBe("SECTION_PARENT_NOT_FOUND")
      expect(error.status).toBe(404)
    }
    expect(applyImportStagedInventorySectionDiffMock).not.toHaveBeenCalled()
  })

  it("acquires FOR UPDATE lock before reading the import", async () => {
    const queryRaw = vi.fn().mockResolvedValue([])
    withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({ $queryRaw: queryRaw }),
    )
    await saveImportStagedInventorySectionUseCase(emptyInput())
    expect(queryRaw.mock.invocationCallOrder[0]!).toBeLessThan(
      getImportByIdMock.mock.invocationCallOrder[0]!,
    )
  })
})

describe("saveImportStagedInventorySectionUseCase — form validation", () => {
  it("rejects an added filter row with an invalid form (refKind=tempId)", async () => {
    try {
      await saveImportStagedInventorySectionUseCase({
        importEntryId: IMPORT_ID,
        diff: {
          filters: {
            added: [
              {
                tempId: "tmp-filter",
                // Invalid: productId empty.
                form: filterForm({ productId: "" }),
              },
            ],
            modified: [],
            deleted: [],
          },
          rows: { added: [], modified: [], deleted: [] },
        },
      })
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportStagedInventorySectionExecutionError)) throw error
      expect(error.code).toBe("SECTION_FILTER_VALIDATION_FAILED")
      expect(error.status).toBe(400)
      expect(error.payload).toMatchObject({ refKind: "tempId", ref: "tmp-filter" })
    }
    expect(applyImportStagedInventorySectionDiffMock).not.toHaveBeenCalled()
  })

  it("rejects a modified filter row with an invalid form (refKind=id)", async () => {
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "filter-1", productId: "product-1", categoryFilterId: "cat-1", hasChildren: false },
    ])
    try {
      await saveImportStagedInventorySectionUseCase({
        importEntryId: IMPORT_ID,
        diff: {
          filters: {
            added: [],
            modified: [{ id: "filter-1", form: filterForm({ productId: "" }) }],
            deleted: [],
          },
          rows: { added: [], modified: [], deleted: [] },
        },
      })
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportStagedInventorySectionExecutionError)) throw error
      expect(error.code).toBe("SECTION_FILTER_VALIDATION_FAILED")
      expect(error.payload).toMatchObject({ refKind: "id", ref: "filter-1" })
    }
  })

  it("rejects an added staged row with an invalid form (refKind=tempId)", async () => {
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "filter-1", productId: "product-1", categoryFilterId: "cat-1", hasChildren: false },
    ])
    try {
      await saveImportStagedInventorySectionUseCase({
        importEntryId: IMPORT_ID,
        diff: {
          filters: { added: [], modified: [], deleted: [] },
          rows: {
            added: [
              {
                tempId: "tmp-row",
                filterRowId: "filter-1",
                form: rowForm({ startingStock: "" }),
              },
            ],
            modified: [],
            deleted: [],
          },
        },
      })
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportStagedInventorySectionExecutionError)) throw error
      expect(error.code).toBe("SECTION_ROW_VALIDATION_FAILED")
      expect(error.status).toBe(400)
      expect(error.payload).toMatchObject({ refKind: "tempId", ref: "tmp-row" })
    }
  })

  it("rejects a modified staged row with an invalid form (refKind=id)", async () => {
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "filter-1", productId: "product-1", categoryFilterId: "cat-1", hasChildren: false },
    ])
    listStagedInventoryRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "row-1", filterRowId: "filter-1", status: "DRAFT", isImported: false },
    ])
    try {
      await saveImportStagedInventorySectionUseCase({
        importEntryId: IMPORT_ID,
        diff: {
          filters: { added: [], modified: [], deleted: [] },
          rows: {
            added: [],
            modified: [{ id: "row-1", form: rowForm({ startingStock: "" }) }],
            deleted: [],
          },
        },
      })
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportStagedInventorySectionExecutionError)) throw error
      expect(error.code).toBe("SECTION_ROW_VALIDATION_FAILED")
      expect(error.payload).toMatchObject({ refKind: "id", ref: "row-1" })
    }
  })
})

describe("saveImportStagedInventorySectionUseCase — product batch-fetch", () => {
  it("throws SECTION_FILTER_VALIDATION_FAILED when an added filter row's product is missing", async () => {
    getProductByIdMock.mockResolvedValue(null)
    try {
      await saveImportStagedInventorySectionUseCase({
        importEntryId: IMPORT_ID,
        diff: {
          filters: {
            added: [{ tempId: "tmp-1", form: filterForm({ productId: "ghost" }) }],
            modified: [],
            deleted: [],
          },
          rows: { added: [], modified: [], deleted: [] },
        },
      })
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportStagedInventorySectionExecutionError)) throw error
      expect(error.code).toBe("SECTION_FILTER_VALIDATION_FAILED")
      expect(error.payload).toMatchObject({ productId: "ghost" })
    }
  })

  it("deduplicates product fetches across added + modified filter diffs", async () => {
    // The batch-fetch (Step 4) runs BEFORE the diff validators (Step 6),
    // so the fetch is observable even when the post-diff projection has a
    // duplicate-product violation. The test asserts fetch deduplication;
    // the downstream validator firing is incidental.
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "filter-existing", productId: "product-x", categoryFilterId: "cat-1", hasChildren: false },
    ])
    getProductByIdMock.mockResolvedValue(fakeProduct({ id: "product-shared" }))

    await expect(
      saveImportStagedInventorySectionUseCase({
        importEntryId: IMPORT_ID,
        diff: {
          filters: {
            added: [{ tempId: "t1", form: filterForm({ productId: "product-shared" }) }],
            modified: [{ id: "filter-existing", form: filterForm({ productId: "product-shared" }) }],
            deleted: [],
          },
          rows: { added: [], modified: [], deleted: [] },
        },
      }),
    ).rejects.toBeInstanceOf(ImportStagedInventorySectionExecutionError)

    // product-shared appears in both added + modified — fetched exactly once.
    expect(getProductByIdMock).toHaveBeenCalledTimes(1)
    expect(getProductByIdMock).toHaveBeenCalledWith("product-shared", expect.anything())
  })
})

describe("saveImportStagedInventorySectionUseCase — cross-slice diff validators", () => {
  it("surfaces SECTION_FILTER_DIFF_VALIDATION_FAILED when domain filters validator returns issues", async () => {
    // Force the duplicate-product check by adding two filter rows for the
    // same product (and providing both products in the batch-fetch).
    getProductByIdMock.mockResolvedValue(fakeProduct({ id: "product-dup" }))

    try {
      await saveImportStagedInventorySectionUseCase({
        importEntryId: IMPORT_ID,
        diff: {
          filters: {
            added: [
              { tempId: "t1", form: filterForm({ productId: "product-dup" }) },
              { tempId: "t2", form: filterForm({ productId: "product-dup" }) },
            ],
            modified: [],
            deleted: [],
          },
          rows: { added: [], modified: [], deleted: [] },
        },
      })
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportStagedInventorySectionExecutionError)) throw error
      expect(error.code).toBe("SECTION_FILTER_DIFF_VALIDATION_FAILED")
      expect(error.status).toBe(400)
    }
    expect(applyImportStagedInventorySectionDiffMock).not.toHaveBeenCalled()
  })

  it("surfaces SECTION_ROW_DIFF_VALIDATION_FAILED when staged-row's parent is unsaved (unsaved-parent rule)", async () => {
    // No existing filter rows; added staged row's filterRowId doesn't match anything.
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([])

    try {
      await saveImportStagedInventorySectionUseCase({
        importEntryId: IMPORT_ID,
        diff: {
          filters: { added: [], modified: [], deleted: [] },
          rows: {
            added: [{ tempId: "tmp", filterRowId: "unsaved-filter", form: rowForm() }],
            modified: [],
            deleted: [],
          },
        },
      })
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportStagedInventorySectionExecutionError)) throw error
      expect(error.code).toBe("SECTION_ROW_DIFF_VALIDATION_FAILED")
    }
  })
})

describe("saveImportStagedInventorySectionUseCase — happy path snapshot resolution", () => {
  it("snapshots stockUnit from the BATCH-FETCHED product for an added staged row under a MODIFIED filter", async () => {
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "filter-1", productId: "product-old", categoryFilterId: "cat-1", hasChildren: false },
    ])
    listStagedInventoryRowDiffSummariesByImportMock.mockResolvedValue([])
    getProductByIdMock.mockResolvedValueOnce(
      fakeProduct({ id: "product-new", stockUnitName: "New Unit", stockUnitAbbrev: "nu" }),
    )

    await saveImportStagedInventorySectionUseCase({
      importEntryId: IMPORT_ID,
      diff: {
        filters: {
          added: [],
          modified: [
            { id: "filter-1", form: filterForm({ productId: "product-new" }) },
          ],
          deleted: [],
        },
        rows: {
          added: [
            {
              tempId: "tmp-row",
              filterRowId: "filter-1",
              form: rowForm({ startingStock: "7" }),
            },
          ],
          modified: [],
          deleted: [],
        },
      },
    })

    expect(applyImportStagedInventorySectionDiffMock).toHaveBeenCalledTimes(1)
    const args = applyImportStagedInventorySectionDiffMock.mock.calls[0]?.[1] as {
      rows: { added: Array<{ id: string; tempId: string; input: Record<string, unknown> }> }
    }
    expect(args.rows.added).toHaveLength(1)
    const addedRow = args.rows.added[0]!
    expect(addedRow.tempId).toBe("tmp-row")
    expect(addedRow.input).toMatchObject({
      filterRowId: "filter-1",
      productId: "product-new",
      warehouseId: WAREHOUSE_ID,
      stockUnitName: "New Unit",
      stockUnitAbbrev: "nu",
      startingStock: "7",
    })
  })

  it("snapshots stockUnit via the ENRICHMENT pass for an added staged row under an EXISTING (unchanged) filter", async () => {
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "filter-1", productId: "product-existing", categoryFilterId: "cat-1", hasChildren: false },
    ])
    listStagedInventoryRowDiffSummariesByImportMock.mockResolvedValue([])
    // No filter-row diff for "filter-1" — but the staged row references it.
    // The use case should re-fetch product-existing in the enrichment pass.
    getProductByIdMock.mockResolvedValueOnce(
      fakeProduct({ id: "product-existing", stockUnitName: "Existing Unit", stockUnitAbbrev: "eu" }),
    )

    await saveImportStagedInventorySectionUseCase({
      importEntryId: IMPORT_ID,
      diff: {
        filters: { added: [], modified: [], deleted: [] },
        rows: {
          added: [
            { tempId: "tmp", filterRowId: "filter-1", form: rowForm() },
          ],
          modified: [],
          deleted: [],
        },
      },
    })

    const args = applyImportStagedInventorySectionDiffMock.mock.calls[0]?.[1] as {
      rows: { added: Array<{ input: Record<string, unknown> }> }
    }
    expect(args.rows.added[0]!.input).toMatchObject({
      productId: "product-existing",
      stockUnitName: "Existing Unit",
      stockUnitAbbrev: "eu",
    })
  })

  it("normalizes empty form strings to null on added staged rows (rollNumber, dyeLot, location, note)", async () => {
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "filter-1", productId: "product-1", categoryFilterId: "cat-1", hasChildren: false },
    ])
    listStagedInventoryRowDiffSummariesByImportMock.mockResolvedValue([])
    getProductByIdMock.mockResolvedValueOnce(fakeProduct({ id: "product-1" }))

    await saveImportStagedInventorySectionUseCase({
      importEntryId: IMPORT_ID,
      diff: {
        filters: { added: [], modified: [], deleted: [] },
        rows: {
          added: [
            { tempId: "tmp", filterRowId: "filter-1", form: rowForm() },
          ],
          modified: [],
          deleted: [],
        },
      },
    })

    const input = (applyImportStagedInventorySectionDiffMock.mock.calls[0]?.[1] as {
      rows: { added: Array<{ input: Record<string, unknown> }> }
    }).rows.added[0]!.input
    expect(input.rollNumber).toBeNull()
    expect(input.dyeLot).toBeNull()
    expect(input.location).toBeNull()
    expect(input.note).toBeNull()
    expect(input.startingStock).toBe("5")
  })

  it("normalizes empty form strings to null on modified staged rows", async () => {
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "filter-1", productId: "product-1", categoryFilterId: "cat-1", hasChildren: false },
    ])
    listStagedInventoryRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "row-1", filterRowId: "filter-1", status: "DRAFT", isImported: false },
    ])

    await saveImportStagedInventorySectionUseCase({
      importEntryId: IMPORT_ID,
      diff: {
        filters: { added: [], modified: [], deleted: [] },
        rows: {
          added: [],
          modified: [{ id: "row-1", form: rowForm({ startingStock: "9", rollNumber: "" }) }],
          deleted: [],
        },
      },
    })

    const input = (applyImportStagedInventorySectionDiffMock.mock.calls[0]?.[1] as {
      rows: { modified: Array<{ input: Record<string, unknown> }> }
    }).rows.modified[0]!.input
    expect(input.rollNumber).toBeNull()
    expect(input.startingStock).toBe("9")
  })

  it("pre-assigns UUIDs to added filter and row drafts (returned via tempId structure)", async () => {
    getProductByIdMock.mockResolvedValueOnce(fakeProduct({ id: "product-1" }))

    await saveImportStagedInventorySectionUseCase({
      importEntryId: IMPORT_ID,
      diff: {
        filters: {
          added: [{ tempId: "tmp-f", form: filterForm({ productId: "product-1" }) }],
          modified: [],
          deleted: [],
        },
        rows: { added: [], modified: [], deleted: [] },
      },
    })

    const args = applyImportStagedInventorySectionDiffMock.mock.calls[0]?.[1] as {
      filters: { added: Array<{ id: string; tempId: string }> }
    }
    expect(args.filters.added).toHaveLength(1)
    expect(args.filters.added[0]!.tempId).toBe("tmp-f")
    expect(typeof args.filters.added[0]!.id).toBe("string")
    expect(args.filters.added[0]!.id.length).toBeGreaterThan(0)
  })

  it("returns the data layer's result verbatim (filterRows, stagedRows, both tempId maps)", async () => {
    applyImportStagedInventorySectionDiffMock.mockResolvedValue({
      filterRows: [{ id: "f-real" } as never],
      stagedRows: [{ id: "r-real" } as never],
      filterTempIdMap: { "tmp-f": "f-real" },
      rowTempIdMap: { "tmp-r": "r-real" },
    })

    const result = await saveImportStagedInventorySectionUseCase(emptyInput())
    expect(result).toEqual({
      filterRows: [{ id: "f-real" }],
      stagedRows: [{ id: "r-real" }],
      filterTempIdMap: { "tmp-f": "f-real" },
      rowTempIdMap: { "tmp-r": "r-real" },
    })
  })

  it("passes deletes through unchanged for both slices", async () => {
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "filter-old", productId: "p", categoryFilterId: "c", hasChildren: false },
    ])
    listStagedInventoryRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "row-old", filterRowId: "filter-old", status: "DRAFT", isImported: false },
    ])

    await saveImportStagedInventorySectionUseCase({
      importEntryId: IMPORT_ID,
      diff: {
        filters: { added: [], modified: [], deleted: [{ id: "filter-old" }] },
        rows: { added: [], modified: [], deleted: [{ id: "row-old" }] },
      },
    })

    const args = applyImportStagedInventorySectionDiffMock.mock.calls[0]?.[1] as {
      filters: { deleted: Array<{ id: string }> }
      rows: { deleted: Array<{ id: string }> }
    }
    expect(args.filters.deleted).toEqual([{ id: "filter-old" }])
    expect(args.rows.deleted).toEqual([{ id: "row-old" }])
  })
})
