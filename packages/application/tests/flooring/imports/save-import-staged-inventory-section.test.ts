import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getImportByIdMock,
  getProductByIdMock,
  getUnitOfMeasureByIdMock,
  listFilterRowDiffSummariesByImportMock,
  listStagedInventoryRowDiffSummariesByImportMock,
  applyImportStagedInventorySectionDiffMock,
  lockImportRowMock,
  stampImportActorMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  getImportByIdMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  getUnitOfMeasureByIdMock: vi.fn(),
  listFilterRowDiffSummariesByImportMock: vi.fn(),
  listStagedInventoryRowDiffSummariesByImportMock: vi.fn(),
  applyImportStagedInventorySectionDiffMock: vi.fn(),
  lockImportRowMock: vi.fn(),
  stampImportActorMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
  },
  // `db` is the pooled fallback client the use case reads on when no tx client
  // is passed; the read mocks ignore the arg, so a stub is enough.
  db: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  getImportById: getImportByIdMock,
  getProductById: getProductByIdMock,
  getUnitOfMeasureById: getUnitOfMeasureByIdMock,
  listFilterRowDiffSummariesByImport: listFilterRowDiffSummariesByImportMock,
  listStagedInventoryRowDiffSummariesByImport: listStagedInventoryRowDiffSummariesByImportMock,
  applyImportStagedInventorySectionDiff: applyImportStagedInventorySectionDiffMock,
  lockImportRow: lockImportRowMock,
  stampImportActor: stampImportActorMock,
}))

import { saveImportStagedInventorySectionUseCase } from "../../../src/flooring/imports/staged-inventory-section/save-import-staged-inventory-section.js"
import { ImportStagedInventorySectionExecutionError } from "../../../src/flooring/imports/staged-inventory-section/errors.js"
import type { SaveImportStagedInventorySectionInput } from "../../../src/flooring/imports/staged-inventory-section/types.js"

const IMPORT_ID = "import-1"
const WAREHOUSE_ID = "wh-import"
const ACTOR_EMAIL = "actor@example.com"

// Inject the actor email (threaded for the aggregate-root parent stamp) once,
// so each test reads as just its diff input.
const saveSectionUseCase = saveImportStagedInventorySectionUseCase
function runSave(input: SaveImportStagedInventorySectionInput) {
  return saveSectionUseCase(input, ACTOR_EMAIL)
}

type FilterForm = {
  productId: string
  unitId: string
  stockOrdered: string
}
type RowForm = {
  unitId: string
  rollNumber: string
  dyeLot: string
  location: string
  startingStock: string
  cost: string
  freight: string
  note: string
}

function filterForm(overrides: Partial<FilterForm> = {}): FilterForm {
  return {
    productId: "product-1",
    unitId: "unit-1",
    stockOrdered: "10",
    ...overrides,
  }
}
function rowForm(overrides: Partial<RowForm> = {}): RowForm {
  return {
    unitId: "unit-1",
    rollNumber: "",
    dyeLot: "",
    location: "",
    startingStock: "5",
    cost: "",
    freight: "",
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
    internalNotes: "",
    stagedInventoryRowsCount: 0,
    liveInventoryRowsCount: 0,
    createdAt: "2026-05-22T00:00:00.000Z",
    updatedAt: "2026-05-22T00:00:00.000Z",
  }
}

function fakeProduct(overrides: Record<string, unknown> = {}) {
  // Shape relevant to the use case: only `unitId` is read now (the retiring
  // stockUnit* strings are no longer seeded onto staged rows — UoM epic 2B).
  return {
    id: "product-1",
    unitId: "unit-1",
    unitName: "Square Yard",
    unitAbbrev: "sy",
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getImportByIdMock.mockReset()
  getProductByIdMock.mockReset()
  getUnitOfMeasureByIdMock.mockReset()
  listFilterRowDiffSummariesByImportMock.mockReset()
  listStagedInventoryRowDiffSummariesByImportMock.mockReset()
  applyImportStagedInventorySectionDiffMock.mockReset()
  lockImportRowMock.mockReset()
  stampImportActorMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ $queryRaw: vi.fn().mockResolvedValue([]) }),
  )

  getImportByIdMock.mockResolvedValue(fakeImport())
  // Default: any requested product resolves to a stub with that id, so the
  // batch-fetch + snapshot resolution succeeds for filter AND staged products.
  getProductByIdMock.mockImplementation(async (id: string) => fakeProduct({ id }))
  // Default: any referenced unit resolves to a stub so the existence guard passes.
  getUnitOfMeasureByIdMock.mockImplementation(async (id: string) => ({
    id,
    name: "Square Feet",
    abbreviation: "SF",
  }))
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
      await runSave(emptyInput())
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportStagedInventorySectionExecutionError)) throw error
      expect(error.code).toBe("SECTION_PARENT_NOT_FOUND")
      expect(error.status).toBe(404)
    }
    expect(applyImportStagedInventorySectionDiffMock).not.toHaveBeenCalled()
    expect(stampImportActorMock).not.toHaveBeenCalled()
  })

  it("acquires the FOR UPDATE lock before the writes (stamp + diff apply)", async () => {
    // Read-only validation runs on the pool BEFORE the transaction (keeps the
    // interactive tx under its timeout; OCC is enforced at the route). The lock
    // then guards only the write phase — it precedes the stamp and the diff apply.
    await runSave(emptyInput())
    expect(lockImportRowMock).toHaveBeenCalledTimes(1)
    expect(lockImportRowMock.mock.invocationCallOrder[0]!).toBeLessThan(
      stampImportActorMock.mock.invocationCallOrder[0]!,
    )
    expect(lockImportRowMock.mock.invocationCallOrder[0]!).toBeLessThan(
      applyImportStagedInventorySectionDiffMock.mock.invocationCallOrder[0]!,
    )
    // Reads happen before the lock now (outside the transaction).
    expect(getImportByIdMock.mock.invocationCallOrder[0]!).toBeLessThan(
      lockImportRowMock.mock.invocationCallOrder[0]!,
    )
  })

  it("stamps the parent import actor on a successful (even empty) save", async () => {
    await runSave(emptyInput())
    expect(stampImportActorMock).toHaveBeenCalledTimes(1)
    expect(stampImportActorMock).toHaveBeenCalledWith(
      expect.anything(),
      IMPORT_ID,
      ACTOR_EMAIL,
    )
  })
})

describe("saveImportStagedInventorySectionUseCase — form validation", () => {
  it("rejects an added filter row with an invalid form (refKind=tempId)", async () => {
    try {
      await runSave({
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
      { id: "filter-1", productId: "product-1" },
    ])
    try {
      await runSave({
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
    try {
      await runSave({
        importEntryId: IMPORT_ID,
        diff: {
          filters: { added: [], modified: [], deleted: [] },
          rows: {
            added: [
              {
                tempId: "tmp-row",
                productId: "product-1",
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
    listStagedInventoryRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "row-1", status: "DRAFT" },
    ])
    try {
      await runSave({
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

describe("saveImportStagedInventorySectionUseCase — unit clear on modify", () => {
  it("clears a MODIFIED filter row's unit (no product re-seed)", async () => {
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "filter-1", productId: "product-1" },
    ])
    await runSave({
      importEntryId: IMPORT_ID,
      diff: {
        filters: {
          added: [],
          modified: [{ id: "filter-1", form: filterForm({ unitId: "" }) }],
          deleted: [],
        },
        rows: { added: [], modified: [], deleted: [] },
      },
    })
    const [, diff] = applyImportStagedInventorySectionDiffMock.mock.calls[0]
    // The user's clear survives — NOT replaced by the product's own unit ("unit-1").
    expect(diff.filters.modified[0].input.unitId).toBeNull()
  })

  it("clears a MODIFIED staged row's unit (unchanged reference path)", async () => {
    listStagedInventoryRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "row-1", status: "DRAFT" },
    ])
    await runSave({
      importEntryId: IMPORT_ID,
      diff: {
        filters: { added: [], modified: [], deleted: [] },
        rows: {
          added: [],
          modified: [{ id: "row-1", form: rowForm({ unitId: "" }) }],
          deleted: [],
        },
      },
    })
    const [, diff] = applyImportStagedInventorySectionDiffMock.mock.calls[0]
    expect(diff.rows.modified[0].input.unitId).toBeNull()
  })
})

describe("saveImportStagedInventorySectionUseCase — product batch-fetch", () => {
  it("throws SECTION_FILTER_VALIDATION_FAILED when an added filter row's product is missing", async () => {
    getProductByIdMock.mockResolvedValue(null)
    try {
      await runSave({
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
    // The same product can now appear on multiple planned imports (the
    // duplicate-product rule was removed), so the batch-fetch must still
    // collapse repeats: product-shared in both added + modified is fetched once.
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "filter-existing", productId: "product-x" },
    ])
    getProductByIdMock.mockResolvedValue(fakeProduct({ id: "product-shared" }))

    await runSave({
      importEntryId: IMPORT_ID,
      diff: {
        filters: {
          added: [{ tempId: "t1", form: filterForm({ productId: "product-shared" }) }],
          modified: [{ id: "filter-existing", form: filterForm({ productId: "product-shared" }) }],
          deleted: [],
        },
        rows: { added: [], modified: [], deleted: [] },
      },
    })

    // product-shared appears in both added + modified — fetched exactly once.
    expect(getProductByIdMock).toHaveBeenCalledTimes(1)
    expect(getProductByIdMock).toHaveBeenCalledWith("product-shared", expect.anything())
  })
})

describe("saveImportStagedInventorySectionUseCase — diff validators", () => {
  it("surfaces SECTION_FILTER_VALIDATION_FAILED when a modified filter's product no longer exists", async () => {
    // A modified filter referencing a product that does not resolve is caught by
    // the product-existence guard (the sole reachable filter guard now that the
    // category-filter FK — and its immutability rule — has been dropped).
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "filter-1", productId: "product-1" },
    ])
    getProductByIdMock.mockImplementation(async (id: string) =>
      id === "ghost-product" ? null : fakeProduct({ id }),
    )

    try {
      await runSave({
        importEntryId: IMPORT_ID,
        diff: {
          filters: {
            added: [],
            modified: [
              {
                id: "filter-1",
                form: filterForm({ productId: "ghost-product" }),
              },
            ],
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
    }
    expect(applyImportStagedInventorySectionDiffMock).not.toHaveBeenCalled()
  })

  it("surfaces SECTION_ROW_DIFF_VALIDATION_FAILED when a modified staged row is not DRAFT", async () => {
    listStagedInventoryRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "row-1", status: "QUEUED" },
    ])

    try {
      await runSave({
        importEntryId: IMPORT_ID,
        diff: {
          filters: { added: [], modified: [], deleted: [] },
          rows: {
            added: [],
            modified: [{ id: "row-1", form: rowForm({ startingStock: "9" }) }],
            deleted: [],
          },
        },
      })
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportStagedInventorySectionExecutionError)) throw error
      expect(error.code).toBe("SECTION_ROW_DIFF_VALIDATION_FAILED")
    }
    expect(applyImportStagedInventorySectionDiffMock).not.toHaveBeenCalled()
  })
})

describe("saveImportStagedInventorySectionUseCase — happy path snapshot resolution", () => {
  it("does NOT seed the added staged row's unit from the product when the form leaves it blank", async () => {
    getProductByIdMock.mockImplementation(async (id: string) =>
      fakeProduct({ id, unitId: "unit-from-product" }),
    )

    await runSave({
      importEntryId: IMPORT_ID,
      diff: {
        filters: { added: [], modified: [], deleted: [] },
        rows: {
          added: [
            {
              tempId: "tmp-row",
              productId: "product-new",
              // Blank form unit → persisted as null; the server never seeds it
              // from the product (the client owns the on-select seed).
              form: rowForm({ startingStock: "7", unitId: "" }),
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
      productId: "product-new",
      unitId: null,
      startingStock: "7",
    })
    // Warehouse is parent-owned now — the staged row carries no warehouseId.
    expect(addedRow.input).not.toHaveProperty("warehouseId")
    // The staged row no longer carries a filter-row link.
    expect(addedRow.input).not.toHaveProperty("filterRowId")
  })

  it("uses the form's own unit FK when present (overriding the product default)", async () => {
    getProductByIdMock.mockImplementation(async (id: string) =>
      fakeProduct({ id, unitId: "unit-from-product" }),
    )

    await runSave({
      importEntryId: IMPORT_ID,
      diff: {
        filters: { added: [], modified: [], deleted: [] },
        rows: {
          added: [
            {
              tempId: "tmp-row",
              productId: "product-new",
              form: rowForm({ startingStock: "7", unitId: "unit-user-picked" }),
            },
          ],
          modified: [],
          deleted: [],
        },
      },
    })

    const input = (applyImportStagedInventorySectionDiffMock.mock.calls[0]?.[1] as {
      rows: { added: Array<{ input: Record<string, unknown> }> }
    }).rows.added[0]!.input
    expect(input.unitId).toBe("unit-user-picked")
  })

  it("throws when an added staged row's product is missing", async () => {
    getProductByIdMock.mockResolvedValue(null)
    try {
      await runSave({
        importEntryId: IMPORT_ID,
        diff: {
          filters: { added: [], modified: [], deleted: [] },
          rows: {
            added: [{ tempId: "tmp", productId: "ghost", form: rowForm() }],
            modified: [],
            deleted: [],
          },
        },
      })
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportStagedInventorySectionExecutionError)) throw error
      expect(error.payload).toMatchObject({ productId: "ghost" })
    }
    expect(applyImportStagedInventorySectionDiffMock).not.toHaveBeenCalled()
  })

  it("normalizes empty form strings to null on added staged rows (rollNumber, dyeLot, location, note)", async () => {
    await runSave({
      importEntryId: IMPORT_ID,
      diff: {
        filters: { added: [], modified: [], deleted: [] },
        rows: {
          added: [
            { tempId: "tmp", productId: "product-1", form: rowForm() },
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
    expect(input.cost).toBeNull()
    expect(input.freight).toBeNull()
  })

  it("normalizes present cost/freight to canonical money strings on added staged rows", async () => {
    await runSave({
      importEntryId: IMPORT_ID,
      diff: {
        filters: { added: [], modified: [], deleted: [] },
        rows: {
          added: [
            { tempId: "tmp", productId: "product-1", form: rowForm({ cost: "12.5", freight: "3" }) },
          ],
          modified: [],
          deleted: [],
        },
      },
    })

    const input = (applyImportStagedInventorySectionDiffMock.mock.calls[0]?.[1] as {
      rows: { added: Array<{ input: Record<string, unknown> }> }
    }).rows.added[0]!.input
    expect(input.cost).toBe("12.50")
    expect(input.freight).toBe("3.00")
  })

  it("normalizes empty form strings to null on modified staged rows", async () => {
    listStagedInventoryRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "row-1", status: "DRAFT" },
    ])

    await runSave({
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
    await runSave({
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

    const result = await runSave(emptyInput())
    expect(result).toEqual({
      filterRows: [{ id: "f-real" }],
      stagedRows: [{ id: "r-real" }],
      filterTempIdMap: { "tmp-f": "f-real" },
      rowTempIdMap: { "tmp-r": "r-real" },
    })
  })

  it("passes deletes through unchanged for both slices", async () => {
    listFilterRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "filter-old", productId: "p" },
    ])
    listStagedInventoryRowDiffSummariesByImportMock.mockResolvedValue([
      { id: "row-old", status: "DRAFT" },
    ])

    await runSave({
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
