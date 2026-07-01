import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  lockImportRowMock,
  getImportByIdMock,
  getWarehouseByIdMock,
  getImportLinkStateMock,
  updateImportRecordMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  lockImportRowMock: vi.fn(),
  getImportByIdMock: vi.fn(),
  getWarehouseByIdMock: vi.fn(),
  getImportLinkStateMock: vi.fn(),
  updateImportRecordMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
  },
  withDatabaseTransaction: withDatabaseTransactionMock,
  lockImportRow: lockImportRowMock,
  getImportById: getImportByIdMock,
  getWarehouseById: getWarehouseByIdMock,
  getImportLinkState: getImportLinkStateMock,
  updateImportRecord: updateImportRecordMock,
}))

import { updateImportUseCase } from "../../../src/flooring/imports/update-import.js"
import { ImportExecutionError } from "../../../src/flooring/imports/errors.js"

const ACTOR = "editor@example.com"
const IMPORT_ID = "import-1"

function currentRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: IMPORT_ID,
    importNumber: 1,
    purchaseOrderNumber: "PO-1",
    internalNotes: "",
    warehouseId: "wh-1",
    warehouseName: "Main",
    color: "SLATE",
    stagedInventoryRowsCount: 0,
    liveInventoryRowsCount: 0,
    createdAt: "2026-05-22T00:00:00.000Z",
    updatedAt: "2026-05-22T00:00:00.000Z",
    createdBy: "creator@example.com",
    updatedBy: "creator@example.com",
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  lockImportRowMock.mockReset()
  getImportByIdMock.mockReset()
  getWarehouseByIdMock.mockReset()
  getImportLinkStateMock.mockReset()
  updateImportRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ $queryRaw: vi.fn().mockResolvedValue([]) }),
  )
  getImportByIdMock.mockResolvedValue(currentRecord())
  getWarehouseByIdMock.mockResolvedValue({ id: "wh-1" })
  getImportLinkStateMock.mockResolvedValue(null)
  updateImportRecordMock.mockResolvedValue(currentRecord())
})

describe("updateImportUseCase — actor stamping", () => {
  it("throws (before lock/read) when actorEmail is empty", async () => {
    await expect(updateImportUseCase(IMPORT_ID, {}, "")).rejects.toThrow(
      /non-empty actorEmail/,
    )
    expect(withDatabaseTransactionMock).not.toHaveBeenCalled()
    expect(lockImportRowMock).not.toHaveBeenCalled()
    expect(updateImportRecordMock).not.toHaveBeenCalled()
  })

  it("stamps updatedBy even when no editable field changed (empty diff)", async () => {
    await updateImportUseCase(IMPORT_ID, {}, ACTOR)
    expect(updateImportRecordMock).toHaveBeenCalledTimes(1)
    const [id, dbInput] = updateImportRecordMock.mock.calls[0]!
    expect(id).toBe(IMPORT_ID)
    expect(dbInput).toEqual({ updatedBy: ACTOR })
  })

  it("never stamps createdBy on update (immutable post-create)", async () => {
    await updateImportUseCase(IMPORT_ID, { internalNotes: "new note" }, ACTOR)
    const [, dbInput] = updateImportRecordMock.mock.calls[0]!
    expect(dbInput).not.toHaveProperty("createdBy")
    expect(dbInput).toMatchObject({ updatedBy: ACTOR, internalNotes: "new note" })
  })

  it("rides the palette color through to the repo unread (metadata-only, no recompute)", async () => {
    await updateImportUseCase(IMPORT_ID, { color: "VIOLET" }, ACTOR)
    expect(updateImportRecordMock).toHaveBeenCalledWith(
      IMPORT_ID,
      expect.objectContaining({ color: "VIOLET", updatedBy: ACTOR }),
      expect.anything(),
    )
  })

  it("acquires the FOR UPDATE lock before reading the import", async () => {
    await updateImportUseCase(IMPORT_ID, {}, ACTOR)
    expect(lockImportRowMock).toHaveBeenCalledTimes(1)
    expect(lockImportRowMock.mock.invocationCallOrder[0]!).toBeLessThan(
      getImportByIdMock.mock.invocationCallOrder[0]!,
    )
  })
})

describe("updateImportUseCase — guards", () => {
  it("throws IMPORT_NOT_FOUND when the import does not exist", async () => {
    getImportByIdMock.mockResolvedValue(null)
    try {
      await updateImportUseCase(IMPORT_ID, {}, ACTOR)
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportExecutionError)) throw error
      expect(error.code).toBe("IMPORT_NOT_FOUND")
    }
    expect(updateImportRecordMock).not.toHaveBeenCalled()
  })

  it("blocks a warehouse change when inventory is linked", async () => {
    getWarehouseByIdMock.mockResolvedValue({ id: "wh-2" })
    getImportLinkStateMock.mockResolvedValue({
      stagedInventoryRowCount: 3,
      liveInventoryRowCount: 1,
    })
    try {
      await updateImportUseCase(IMPORT_ID, { warehouseId: "wh-2" }, ACTOR)
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportExecutionError)) throw error
      expect(error.code).toBe("IMPORT_WAREHOUSE_CHANGE_BLOCKED_BY_INVENTORY")
    }
    expect(updateImportRecordMock).not.toHaveBeenCalled()
  })
})
