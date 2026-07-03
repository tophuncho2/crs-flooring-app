import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  listStagedInventoryForMaterializationMock,
  materializeStagedRowsToInventoryMock,
  lockImportRowMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  listStagedInventoryForMaterializationMock: vi.fn(),
  materializeStagedRowsToInventoryMock: vi.fn(),
  lockImportRowMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
  },
  withDatabaseTransaction: withDatabaseTransactionMock,
  listStagedInventoryForMaterialization: listStagedInventoryForMaterializationMock,
  materializeStagedRowsToInventory: materializeStagedRowsToInventoryMock,
  lockImportRow: lockImportRowMock,
}))

import { materializeImportedStagedRowsUseCase } from "../../../src/flooring/imports/staged-inventory-rows/materialize-imported-rows.js"
import { StagedInventoryExecutionError } from "../../../src/flooring/imports/staged-inventory-rows/errors.js"
import type { ImportMaterializeBatchPayload } from "@builders/domain"

const IMPORT_ID = "11111111-1111-4111-8111-111111111111"
const ROW_ID_A = "22222222-2222-4222-8222-222222222222"
const ROW_ID_B = "22222222-2222-4222-8222-222222222223"

function payload(stagedRowIds: string[] = [ROW_ID_A]): ImportMaterializeBatchPayload {
  return {
    version: "v1",
    topic: "flooring.imports.materialize",
    importEntryId: IMPORT_ID,
    stagedRowIds,
    requestedBy: {
      userId: "33333333-3333-4333-8333-333333333333",
      userEmail: "user@example.com",
    },
    requestedAt: "2026-05-22T12:00:00.000Z",
  }
}

function loadedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ROW_ID_A,
    importEntryId: IMPORT_ID,
    productId: "product-1",
    // The staged row's OWN unit FK (UoM epic 2B) — the worker materializes this
    // forward verbatim.
    unitId: "unit-staged-1",
    warehouseId: "wh-staged-snapshot",
    rollPrefix: "ROLL#",
    rollNumber: "A-001",
    dyeLot: "lot-1",
    location: "Aisle 4",
    startingStock: { toString: () => "12.50" },
    note: "test note",
    status: "QUEUED" as const,
    isImported: true,
    importEntry: {
      id: IMPORT_ID,
      importNumber: 42,
      purchaseOrderNumber: "PO-2026-1",
      warehouseId: "wh-import",
    },
    product: {
      id: "product-1",
      name: "Carpet — Style A — Beige",
      unitName: "Square Yard",
      unitAbbrev: "sy",
      unitName: "Roll",
      unitAbbrev: "rl",
      category: {
        id: "cat-1",
        slug: "carpet",
        name: "Carpet",
      },
    },
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  listStagedInventoryForMaterializationMock.mockReset()
  materializeStagedRowsToInventoryMock.mockReset()
  lockImportRowMock.mockReset()

  // Default: withDatabaseTransaction just runs the callback with a bare fake tx.
  // The FOR UPDATE lock now goes through the mocked lockImportRow helper, not
  // tx.$queryRaw directly.
  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))

  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-05-22T12:00:00.000Z"))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("materializeImportedStagedRowsUseCase", () => {
  describe("happy path", () => {
    it("returns { created, materializedStagedRowIds } from the data layer", async () => {
      listStagedInventoryForMaterializationMock.mockResolvedValue([loadedRow()])
      materializeStagedRowsToInventoryMock.mockResolvedValue({
        created: [{ id: "inv-1", inventoryNumber: "INV-00001" }],
        materializedStagedRowIds: [ROW_ID_A],
      })

      const result = await materializeImportedStagedRowsUseCase(payload())

      expect(result).toEqual({
        created: [{ id: "inv-1", inventoryNumber: "INV-00001" }],
        materializedStagedRowIds: [ROW_ID_A],
      })
    })

    it("acquires a FOR UPDATE lock on the parent import before reading staged rows", async () => {
      listStagedInventoryForMaterializationMock.mockResolvedValue([loadedRow()])
      materializeStagedRowsToInventoryMock.mockResolvedValue({
        created: [{ id: "inv-1", inventoryNumber: "INV-00001" }],
        materializedStagedRowIds: [ROW_ID_A],
      })

      await materializeImportedStagedRowsUseCase(payload())

      expect(lockImportRowMock).toHaveBeenCalledTimes(1)
      // Lock was acquired BEFORE the materialize read fired.
      const lockCallOrder = lockImportRowMock.mock.invocationCallOrder[0]!
      const readCallOrder = listStagedInventoryForMaterializationMock.mock.invocationCallOrder[0]!
      expect(lockCallOrder).toBeLessThan(readCallOrder)
    })

    it("forwards importEntryId and stagedRowIds to the materialize-list read", async () => {
      listStagedInventoryForMaterializationMock.mockResolvedValue([
        loadedRow({ id: ROW_ID_A }),
        loadedRow({ id: ROW_ID_B }),
      ])
      materializeStagedRowsToInventoryMock.mockResolvedValue({
        created: [
          { id: "inv-1", inventoryNumber: "INV-00001" },
          { id: "inv-2", inventoryNumber: "INV-00002" },
        ],
        materializedStagedRowIds: [ROW_ID_A, ROW_ID_B],
      })

      await materializeImportedStagedRowsUseCase(payload([ROW_ID_A, ROW_ID_B]))

      expect(listStagedInventoryForMaterializationMock).toHaveBeenCalledWith(
        expect.anything(),
        { importEntryId: IMPORT_ID, ids: [ROW_ID_A, ROW_ID_B] },
      )
    })
  })

  describe("snapshot stamping (sourcing rules from materialize-imported-rows.ts)", () => {
    it("stamps every denormalized column from the right source row", async () => {
      listStagedInventoryForMaterializationMock.mockResolvedValue([loadedRow()])
      materializeStagedRowsToInventoryMock.mockResolvedValue({
        created: [{ id: "inv-1", inventoryNumber: "INV-00001" }],
        materializedStagedRowIds: [ROW_ID_A],
      })

      await materializeImportedStagedRowsUseCase(payload())

      const callArgs = materializeStagedRowsToInventoryMock.mock.calls[0]?.[1] as {
        importEntryId: string
        inventoryRowsToCreate: Array<Record<string, unknown>>
      }
      expect(callArgs.importEntryId).toBe(IMPORT_ID)
      expect(callArgs.inventoryRowsToCreate).toHaveLength(1)

      const created = callArgs.inventoryRowsToCreate[0]!
      // Neither importNumber nor purchaseOrderNumber is stamped by the worker
      // any longer — both are derived from the importEntry join at read time now
      // that their snapshot columns are dropped. Only the FK is stamped.
      expect(created.importNumber).toBeUndefined()
      expect(created.purchaseOrderNumber).toBeUndefined()
      expect(created.importEntryId).toBe(IMPORT_ID)
      // From product — only the FK is stamped; the product name is no longer
      // snapshotted (rendered from the live `product` join at read time).
      expect(created.productId).toBe("product-1")
      expect(created.productName).toBeUndefined()
      // Unit FK is carried forward from the staged row's OWN unitId (UoM epic
      // 2B) — no longer re-derived from the product's retiring snapshot strings.
      expect(created.unitId).toBe("unit-staged-1")
      expect(created.unitName).toBeUndefined()
      expect(created.unitAbbrev).toBeUndefined()
      expect(created.unitName).toBeUndefined()
      expect(created.unitAbbrev).toBeUndefined()
      // User values copied verbatim from staged row.
      expect(created.rollPrefix).toBe("ROLL#")
      expect(created.rollNumber).toBe("A-001")
      expect(created.dyeLot).toBe("lot-1")
      expect(created.location).toBe("Aisle 4")
      expect(created.note).toBe("test note")
      // startingStock decimal-stringified.
      expect(created.startingStock).toBe("12.50")
      // internalNotes always null (user-only column, never seeded by worker).
      expect(created.internalNotes).toBeNull()
      // sourceStagedRowId points back to the staged row.
      expect(created.sourceStagedRowId).toBe(ROW_ID_A)
      // id is a UUID assigned by the use case.
      expect(typeof created.id).toBe("string")
      expect(created.id).not.toBe(ROW_ID_A)
      // Actor columns stamped with the requesting user's email (the user who
      // marked the rows for import) — both createdBy and updatedBy.
      expect(created.createdBy).toBe("user@example.com")
      expect(created.updatedBy).toBe("user@example.com")
    })

    it("stamps createdBy and updatedBy with requestedBy.userEmail", async () => {
      listStagedInventoryForMaterializationMock.mockResolvedValue([loadedRow()])
      materializeStagedRowsToInventoryMock.mockResolvedValue({
        created: [{ id: "inv-1", inventoryNumber: "INV-00001" }],
        materializedStagedRowIds: [ROW_ID_A],
      })

      await materializeImportedStagedRowsUseCase(payload())

      const created = (
        materializeStagedRowsToInventoryMock.mock.calls[0]?.[1] as {
          inventoryRowsToCreate: Array<Record<string, unknown>>
        }
      ).inventoryRowsToCreate[0]!
      expect(created.createdBy).toBe("user@example.com")
      expect(created.updatedBy).toBe("user@example.com")
    })

    it("PINS warehouseId.immutable: copies warehouseId from STAGED ROW, not from import entry", async () => {
      // The staged row carries its own warehouseId snapshot (set at create
      // time from the parent import). The worker must use THAT, not the
      // import entry's current warehouseId, since the import's warehouse
      // can be updated after staged rows are created.
      listStagedInventoryForMaterializationMock.mockResolvedValue([
        loadedRow({
          warehouseId: "wh-staged-original",
          importEntry: {
            id: IMPORT_ID,
            importNumber: 42,
            purchaseOrderNumber: "PO",
            warehouseId: "wh-import-changed-later",
          },
        }),
      ])
      materializeStagedRowsToInventoryMock.mockResolvedValue({
        created: [{ id: "inv-1", inventoryNumber: "INV-00001" }],
        materializedStagedRowIds: [ROW_ID_A],
      })

      await materializeImportedStagedRowsUseCase(payload())

      const created = (materializeStagedRowsToInventoryMock.mock.calls[0]?.[1] as {
        inventoryRowsToCreate: Array<Record<string, unknown>>
      }).inventoryRowsToCreate[0]!
      expect(created.warehouseId).toBe("wh-staged-original")
    })

    it("assigns a unique id to each created inventory row in a batch", async () => {
      listStagedInventoryForMaterializationMock.mockResolvedValue([
        loadedRow({ id: ROW_ID_A }),
        loadedRow({ id: ROW_ID_B }),
      ])
      materializeStagedRowsToInventoryMock.mockResolvedValue({
        created: [
          { id: "inv-1", inventoryNumber: "INV-00001" },
          { id: "inv-2", inventoryNumber: "INV-00002" },
        ],
        materializedStagedRowIds: [ROW_ID_A, ROW_ID_B],
      })

      await materializeImportedStagedRowsUseCase(payload([ROW_ID_A, ROW_ID_B]))

      const createdRows = (materializeStagedRowsToInventoryMock.mock.calls[0]?.[1] as {
        inventoryRowsToCreate: Array<Record<string, unknown>>
      }).inventoryRowsToCreate
      expect(createdRows).toHaveLength(2)
      expect(createdRows[0]!.id).not.toBe(createdRows[1]!.id)
      expect(createdRows[0]!.sourceStagedRowId).toBe(ROW_ID_A)
      expect(createdRows[1]!.sourceStagedRowId).toBe(ROW_ID_B)
    })
  })

  describe("precondition failures (idempotency backstop)", () => {
    it("throws STAGED_MATERIALIZE_PRECONDITION_FAILED when loaded < requested rows", async () => {
      // Duplicate worker run: rows already flipped IMPORTED → status filter
      // excludes them → loadedRows is shorter than payload.stagedRowIds.
      listStagedInventoryForMaterializationMock.mockResolvedValue([loadedRow({ id: ROW_ID_A })])

      await expect(
        materializeImportedStagedRowsUseCase(payload([ROW_ID_A, ROW_ID_B])),
      ).rejects.toMatchObject({
        code: "STAGED_MATERIALIZE_PRECONDITION_FAILED",
        status: 409,
      })
    })

    it("attaches missingIds payload identifying the rows that didn't come back", async () => {
      listStagedInventoryForMaterializationMock.mockResolvedValue([loadedRow({ id: ROW_ID_A })])

      try {
        await materializeImportedStagedRowsUseCase(payload([ROW_ID_A, ROW_ID_B]))
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof StagedInventoryExecutionError)) throw error
        expect(error.code).toBe("STAGED_MATERIALIZE_PRECONDITION_FAILED")
        expect(error.payload).toEqual({
          expectedCount: 2,
          actualCount: 1,
          missingIds: [ROW_ID_B],
        })
      }
    })

    it("throws when a loaded staged row is missing its unit FK (UoM epic 2B backstop)", async () => {
      // The importability gate blocks a null-unit row from queueing, so this is
      // a precondition regression — the worker refuses to materialize a null unit
      // into inventory's NOT-NULL column.
      listStagedInventoryForMaterializationMock.mockResolvedValue([loadedRow({ unitId: null })])

      try {
        await materializeImportedStagedRowsUseCase(payload())
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof StagedInventoryExecutionError)) throw error
        expect(error.code).toBe("STAGED_MATERIALIZE_PRECONDITION_FAILED")
        expect(error.status).toBe(409)
        expect(error.payload).toMatchObject({ missingIds: [ROW_ID_A] })
      }
      expect(materializeStagedRowsToInventoryMock).not.toHaveBeenCalled()
    })

    it("does NOT call materializeStagedRowsToInventory when precondition fails", async () => {
      listStagedInventoryForMaterializationMock.mockResolvedValue([])

      await expect(
        materializeImportedStagedRowsUseCase(payload([ROW_ID_A])),
      ).rejects.toBeInstanceOf(StagedInventoryExecutionError)
      expect(materializeStagedRowsToInventoryMock).not.toHaveBeenCalled()
    })

    it("idempotency: zero loaded rows on a single-id batch dead-letters cleanly (the duplicate-job case)", async () => {
      listStagedInventoryForMaterializationMock.mockResolvedValue([])

      try {
        await materializeImportedStagedRowsUseCase(payload([ROW_ID_A]))
        expect.fail("Expected throw")
      } catch (error) {
        if (!(error instanceof StagedInventoryExecutionError)) throw error
        expect(error.code).toBe("STAGED_MATERIALIZE_PRECONDITION_FAILED")
        expect(error.payload).toMatchObject({
          expectedCount: 1,
          actualCount: 0,
          missingIds: [ROW_ID_A],
        })
      }
    })
  })

  describe("transaction wrapping", () => {
    it("uses the caller-provided client when one is passed (no nested transaction)", async () => {
      const providedClient = {}
      const innerTx = {}
      // Make withDatabaseTransaction still invoke the callback with a DIFFERENT
      // tx — the lockImportRow assertion below confirms the explicit client wins.
      withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
        cb(innerTx),
      )
      listStagedInventoryForMaterializationMock.mockResolvedValue([loadedRow()])
      materializeStagedRowsToInventoryMock.mockResolvedValue({
        created: [{ id: "inv-1", inventoryNumber: "INV-00001" }],
        materializedStagedRowIds: [ROW_ID_A],
      })

      // Cast — signature wants Prisma.TransactionClient; we duck-type since
      // the use case only forwards the client into mocked data-layer calls.
      await materializeImportedStagedRowsUseCase(
        payload(),
        providedClient as unknown as Parameters<typeof materializeImportedStagedRowsUseCase>[1],
      )

      expect(lockImportRowMock).toHaveBeenCalledTimes(1)
      expect(lockImportRowMock.mock.calls[0]![0]).toBe(providedClient)
    })
  })
})
