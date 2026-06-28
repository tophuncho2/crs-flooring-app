import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getImportByIdMock,
  listStagedInventoryByImportMock,
  markStagedRowsForImportMock,
  createQueueOutboxEventMock,
  lockImportRowMock,
  stampImportActorMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  getImportByIdMock: vi.fn(),
  listStagedInventoryByImportMock: vi.fn(),
  markStagedRowsForImportMock: vi.fn(),
  createQueueOutboxEventMock: vi.fn(),
  lockImportRowMock: vi.fn(),
  stampImportActorMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
  },
  withDatabaseTransaction: withDatabaseTransactionMock,
  getImportById: getImportByIdMock,
  listStagedInventoryByImport: listStagedInventoryByImportMock,
  markStagedRowsForImport: markStagedRowsForImportMock,
  createQueueOutboxEvent: createQueueOutboxEventMock,
  lockImportRow: lockImportRowMock,
  stampImportActor: stampImportActorMock,
}))

import { sha256Hex } from "@builders/lib/hashing"
import { markStagedRowsForImportUseCase } from "../../../src/flooring/imports/staged-inventory-rows/mark-staged-rows-for-import.js"
import { StagedInventoryExecutionError } from "../../../src/flooring/imports/staged-inventory-rows/errors.js"

const IMPORT_ID = "11111111-1111-4111-8111-111111111111"
const ROW_ID_A = "22222222-2222-4222-8222-222222222222"
const ROW_ID_B = "22222222-2222-4222-8222-222222222223"
const ROW_ID_C = "22222222-2222-4222-8222-222222222224"
const REQUESTED_BY = {
  userId: "33333333-3333-4333-8333-333333333333",
  userEmail: "user@example.com",
}

function readyStagedRow(overrides: Record<string, unknown> = {}) {
  // Shape: StagedInventoryRecord = StagedInventoryRow (normalized).
  return {
    id: ROW_ID_A,
    importEntryId: IMPORT_ID,
    importNumber: 1,
    productId: "product-1",
    productName: "Product",
    categoryId: "cat-1",
    stockUnitName: "sy",
    stockUnitAbbrev: "sy",
    rollPrefix: "ROLL#",
    rollNumber: "",
    dyeLot: "",
    warehouseId: "wh-1",
    warehouseName: "Main",
    location: "",
    startingStock: "5",
    status: "DRAFT" as const,
    isImported: false,
    note: "",
    createdAt: "2026-05-22T00:00:00.000Z",
    updatedAt: "2026-05-22T00:00:00.000Z",
    ...overrides,
  }
}

function importRow(overrides: Record<string, unknown> = {}) {
  return {
    id: IMPORT_ID,
    importNumber: 1,
    purchaseOrderNumber: "PO-1",
    warehouseId: "wh-1",
    warehouseName: "Main",
    manufacturerId: "mfr-1",
    manufacturerName: "Acme",
    internalNotes: "",
    stagedInventoryRowsCount: 1,
    liveInventoryRowsCount: 0,
    createdAt: "2026-05-22T00:00:00.000Z",
    updatedAt: "2026-05-22T00:00:00.000Z",
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getImportByIdMock.mockReset()
  listStagedInventoryByImportMock.mockReset()
  markStagedRowsForImportMock.mockReset()
  createQueueOutboxEventMock.mockReset()
  lockImportRowMock.mockReset()
  stampImportActorMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ $queryRaw: vi.fn().mockResolvedValue([]) }),
  )
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-05-22T12:00:00.000Z"))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("markStagedRowsForImportUseCase", () => {
  describe("happy path", () => {
    beforeEach(() => {
      getImportByIdMock.mockResolvedValue(importRow())
      listStagedInventoryByImportMock.mockResolvedValue([
        readyStagedRow({ id: ROW_ID_A }),
        readyStagedRow({ id: ROW_ID_B }),
      ])
      markStagedRowsForImportMock.mockResolvedValue({
        markedRowIds: [ROW_ID_A, ROW_ID_B],
        skippedRowIds: [],
      })
      createQueueOutboxEventMock.mockResolvedValue({
        event: { id: "outbox-1" },
        wasDuplicate: false,
      })
    })

    it("returns markedRowIds, outboxEventId, and wasDuplicate", async () => {
      const result = await markStagedRowsForImportUseCase(
        IMPORT_ID,
        [ROW_ID_A, ROW_ID_B],
        REQUESTED_BY,
      )
      expect(result).toEqual({
        markedRowIds: [ROW_ID_A, ROW_ID_B],
        outboxEventId: "outbox-1",
        wasDuplicate: false,
      })
    })

    it("calls markStagedRowsForImport with importEntryId and the requested row ids", async () => {
      await markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_A, ROW_ID_B], REQUESTED_BY)
      expect(markStagedRowsForImportMock).toHaveBeenCalledWith(expect.anything(), {
        importEntryId: IMPORT_ID,
        stagedRowIds: [ROW_ID_A, ROW_ID_B],
      })
    })

    it("emits the outbox event with the deterministic idempotency key (sorted row ids)", async () => {
      // Mark caller-side reverse-order ids; idempotency key must sort them.
      markStagedRowsForImportMock.mockResolvedValue({
        markedRowIds: [ROW_ID_B, ROW_ID_A],
        skippedRowIds: [],
      })

      await markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_B, ROW_ID_A], REQUESTED_BY)

      const sortedIds = [ROW_ID_A, ROW_ID_B].sort()
      expect(createQueueOutboxEventMock).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: "flooring.imports.materialize",
          aggregateType: "FlooringImportEntry",
          aggregateId: IMPORT_ID,
          idempotencyKey: `import-materialize:${IMPORT_ID}:${sha256Hex(sortedIds.join(","))}`,
          payloadJson: expect.objectContaining({
            version: "v1",
            topic: "flooring.imports.materialize",
            importEntryId: IMPORT_ID,
            stagedRowIds: sortedIds,
            requestedBy: REQUESTED_BY,
            requestedAt: "2026-05-22T12:00:00.000Z",
          }),
        }),
        expect.anything(),
      )
    })

    it("propagates wasDuplicate=true when the outbox sees the same idempotency key twice", async () => {
      createQueueOutboxEventMock.mockResolvedValue({
        event: { id: "outbox-existing" },
        wasDuplicate: true,
      })

      const result = await markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_A, ROW_ID_B], REQUESTED_BY)
      expect(result.wasDuplicate).toBe(true)
      expect(result.outboxEventId).toBe("outbox-existing")
    })

    it("acquires FOR UPDATE lock before reading the import", async () => {
      await markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_A, ROW_ID_B], REQUESTED_BY)

      expect(lockImportRowMock).toHaveBeenCalledTimes(1)
      const lockOrder = lockImportRowMock.mock.invocationCallOrder[0]!
      const fetchOrder = getImportByIdMock.mock.invocationCallOrder[0]!
      expect(lockOrder).toBeLessThan(fetchOrder)
    })

    it("stamps the parent import actor with the requester email", async () => {
      await markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_A, ROW_ID_B], REQUESTED_BY)

      expect(stampImportActorMock).toHaveBeenCalledWith(
        expect.anything(),
        IMPORT_ID,
        REQUESTED_BY.userEmail,
      )
    })
  })

  describe("STAGED_PARENT_NOT_FOUND", () => {
    it("throws 404 when the parent import does not exist", async () => {
      getImportByIdMock.mockResolvedValue(null)

      try {
        await markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_A], REQUESTED_BY)
        expect.fail("expected throw")
      } catch (error) {
        if (!(error instanceof StagedInventoryExecutionError)) throw error
        expect(error.code).toBe("STAGED_PARENT_NOT_FOUND")
        expect(error.status).toBe(404)
      }
      expect(markStagedRowsForImportMock).not.toHaveBeenCalled()
      expect(createQueueOutboxEventMock).not.toHaveBeenCalled()
    })
  })

  describe("STAGED_BATCH_INELIGIBLE — domain readiness gates surfaced to the API", () => {
    beforeEach(() => {
      getImportByIdMock.mockResolvedValue(importRow())
    })

    it("rejects a batch containing a QUEUED row (already in flight)", async () => {
      listStagedInventoryByImportMock.mockResolvedValue([
        readyStagedRow({ id: ROW_ID_A, status: "QUEUED" }),
      ])
      await expect(
        markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_A], REQUESTED_BY),
      ).rejects.toMatchObject({ code: "STAGED_BATCH_INELIGIBLE", status: 400 })
      expect(markStagedRowsForImportMock).not.toHaveBeenCalled()
    })

    it("rejects a batch containing an IMPORTED row", async () => {
      listStagedInventoryByImportMock.mockResolvedValue([
        readyStagedRow({ id: ROW_ID_A, status: "IMPORTED", isImported: true }),
      ])
      await expect(
        markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_A], REQUESTED_BY),
      ).rejects.toMatchObject({ code: "STAGED_BATCH_INELIGIBLE" })
    })

    it("rejects a batch with a row missing productId, warehouseId, or startingStock", async () => {
      listStagedInventoryByImportMock.mockResolvedValue([
        readyStagedRow({ id: ROW_ID_A, productId: "" }),
      ])
      await expect(
        markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_A], REQUESTED_BY),
      ).rejects.toMatchObject({ code: "STAGED_BATCH_INELIGIBLE" })

      listStagedInventoryByImportMock.mockResolvedValue([
        readyStagedRow({ id: ROW_ID_A, warehouseId: "" }),
      ])
      await expect(
        markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_A], REQUESTED_BY),
      ).rejects.toMatchObject({ code: "STAGED_BATCH_INELIGIBLE" })

      listStagedInventoryByImportMock.mockResolvedValue([
        readyStagedRow({ id: ROW_ID_A, startingStock: "0" }),
      ])
      await expect(
        markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_A], REQUESTED_BY),
      ).rejects.toMatchObject({ code: "STAGED_BATCH_INELIGIBLE" })
    })

    it("payload.issues lists every blocker so the API can show per-row messages", async () => {
      listStagedInventoryByImportMock.mockResolvedValue([
        readyStagedRow({ id: ROW_ID_A, status: "QUEUED" }),
        readyStagedRow({ id: ROW_ID_B, startingStock: "0" }),
      ])

      try {
        await markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_A, ROW_ID_B], REQUESTED_BY)
        expect.fail("expected throw")
      } catch (error) {
        if (!(error instanceof StagedInventoryExecutionError)) throw error
        const issues = (error.payload?.issues ?? []) as Array<{ rowId: string; reason: string }>
        expect(issues).toEqual([
          { rowId: ROW_ID_A, reason: "ALREADY_QUEUED" },
          { rowId: ROW_ID_B, reason: "ZERO_STARTING_STOCK" },
        ])
      }
    })

    it("only validates rows the caller requested, ignoring other staged rows in the import", async () => {
      // The import has one ready row + one QUEUED row, but the caller is
      // only marking the ready one. The QUEUED row should not contaminate
      // the batch check.
      listStagedInventoryByImportMock.mockResolvedValue([
        readyStagedRow({ id: ROW_ID_A }),
        readyStagedRow({ id: ROW_ID_C, status: "QUEUED" }),
      ])
      markStagedRowsForImportMock.mockResolvedValue({
        markedRowIds: [ROW_ID_A],
        skippedRowIds: [],
      })
      createQueueOutboxEventMock.mockResolvedValue({
        event: { id: "outbox-1" },
        wasDuplicate: false,
      })

      await markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_A], REQUESTED_BY)
      expect(markStagedRowsForImportMock).toHaveBeenCalled()
    })
  })

  describe("STAGED_BATCH_RACE", () => {
    beforeEach(() => {
      getImportByIdMock.mockResolvedValue(importRow())
      listStagedInventoryByImportMock.mockResolvedValue([
        readyStagedRow({ id: ROW_ID_A }),
        readyStagedRow({ id: ROW_ID_B }),
      ])
    })

    it("throws 409 when markStagedRowsForImport returns any skippedRowIds", async () => {
      markStagedRowsForImportMock.mockResolvedValue({
        markedRowIds: [ROW_ID_A],
        skippedRowIds: [ROW_ID_B],
      })

      try {
        await markStagedRowsForImportUseCase(IMPORT_ID, [ROW_ID_A, ROW_ID_B], REQUESTED_BY)
        expect.fail("expected throw")
      } catch (error) {
        if (!(error instanceof StagedInventoryExecutionError)) throw error
        expect(error.code).toBe("STAGED_BATCH_RACE")
        expect(error.status).toBe(409)
        expect(error.payload).toEqual({ skippedRowIds: [ROW_ID_B] })
      }

      // The data primitive ran (it's where we discovered the race), but
      // the outbox event must NOT have been written.
      expect(markStagedRowsForImportMock).toHaveBeenCalled()
      expect(createQueueOutboxEventMock).not.toHaveBeenCalled()
    })
  })
})
