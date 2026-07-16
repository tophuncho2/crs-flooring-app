import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getWarehouseByIdMock,
  entityExistsMock,
  createImportRecordMock,
  getImportByIdMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  getWarehouseByIdMock: vi.fn(),
  entityExistsMock: vi.fn(),
  createImportRecordMock: vi.fn(),
  getImportByIdMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
  },
  withDatabaseTransaction: withDatabaseTransactionMock,
  getWarehouseById: getWarehouseByIdMock,
  entityExists: entityExistsMock,
  createImportRecord: createImportRecordMock,
  // Pool enrich — the lean write returns { id }; the use case re-reads the full
  // record on the pool after the transaction commits.
  getImportById: getImportByIdMock,
}))

import { createImportUseCase } from "../../src/imports/create-import.js"
import { ImportExecutionError } from "../../src/imports/errors.js"

const ACTOR = "actor@example.com"

function validInput(overrides: Record<string, string> = {}) {
  return {
    purchaseOrderNumber: "PO-1",
    internalNotes: "",
    warehouseId: "wh-1",
    entityId: "",
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getWarehouseByIdMock.mockReset()
  createImportRecordMock.mockReset()
  getImportByIdMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ $queryRaw: vi.fn().mockResolvedValue([]) }),
  )
  getWarehouseByIdMock.mockResolvedValue({ id: "wh-1" })
  entityExistsMock.mockReset()
  entityExistsMock.mockResolvedValue(true)
  // Lean write returns only the new id.
  createImportRecordMock.mockResolvedValue({ id: "import-1" })
  // Pool enrich returns the full record the use case resolves with.
  getImportByIdMock.mockResolvedValue({ id: "import-1", importNumber: 1 })
})

describe("createImportUseCase — actor stamping", () => {
  it("throws (before any DB work) when actorEmail is empty", async () => {
    await expect(createImportUseCase(validInput(), "   ")).rejects.toThrow(
      /non-empty actorEmail/,
    )
    expect(withDatabaseTransactionMock).not.toHaveBeenCalled()
    expect(createImportRecordMock).not.toHaveBeenCalled()
  })

  it("stamps createdBy AND updatedBy with the actor email on create", async () => {
    await createImportUseCase(validInput(), ACTOR)
    expect(createImportRecordMock).toHaveBeenCalledTimes(1)
    expect(createImportRecordMock.mock.calls[0]![0]).toMatchObject({
      warehouseId: "wh-1",
      createdBy: ACTOR,
      updatedBy: ACTOR,
    })
  })

  it("normalizes blank optional fields to null but still stamps the actor", async () => {
    await createImportUseCase(
      validInput({ purchaseOrderNumber: "  " }),
      ACTOR,
    )
    const arg = createImportRecordMock.mock.calls[0]![0] as Record<string, unknown>
    expect(arg.purchaseOrderNumber).toBeNull()
    expect(arg.createdBy).toBe(ACTOR)
    expect(arg.updatedBy).toBe(ACTOR)
  })
})

describe("createImportUseCase — validation", () => {
  it("throws IMPORT_VALIDATION_FAILED when the form has no warehouse", async () => {
    try {
      await createImportUseCase(validInput({ warehouseId: "" }), ACTOR)
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportExecutionError)) throw error
      expect(error.code).toBe("IMPORT_VALIDATION_FAILED")
    }
    expect(createImportRecordMock).not.toHaveBeenCalled()
  })

  it("throws IMPORT_WAREHOUSE_NOT_FOUND when the warehouse does not exist", async () => {
    getWarehouseByIdMock.mockResolvedValue(null)
    try {
      await createImportUseCase(validInput(), ACTOR)
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportExecutionError)) throw error
      expect(error.code).toBe("IMPORT_WAREHOUSE_NOT_FOUND")
    }
    expect(createImportRecordMock).not.toHaveBeenCalled()
  })

  it("throws IMPORT_ENTITY_NOT_FOUND when a supplied entity does not exist", async () => {
    entityExistsMock.mockResolvedValue(false)
    try {
      await createImportUseCase(validInput({ entityId: "ent-missing" }), ACTOR)
      expect.fail("expected throw")
    } catch (error) {
      if (!(error instanceof ImportExecutionError)) throw error
      expect(error.code).toBe("IMPORT_ENTITY_NOT_FOUND")
    }
    expect(createImportRecordMock).not.toHaveBeenCalled()
  })

  it("passes a validated entityId through to the repo", async () => {
    await createImportUseCase(validInput({ entityId: "ent-1" }), ACTOR)
    expect(entityExistsMock).toHaveBeenCalledWith("ent-1", expect.anything())
    expect(createImportRecordMock.mock.calls[0]![0]).toMatchObject({ entityId: "ent-1" })
  })
})

describe("createImportUseCase — pool enrich after commit", () => {
  it("enriches the full record on the pool (no client) using the lean write's id", async () => {
    const result = await createImportUseCase(validInput(), ACTOR)
    // Enrich reads the created id on the pool — invoked with a single arg (no tx
    // client) so it runs on the pooled connection, not the pinned tx one.
    expect(getImportByIdMock).toHaveBeenCalledWith("import-1")
    expect(getImportByIdMock.mock.calls[0]!).toHaveLength(1)
    // The enrich happens after the write resolved.
    expect(createImportRecordMock.mock.invocationCallOrder[0]!).toBeLessThan(
      getImportByIdMock.mock.invocationCallOrder[0]!,
    )
    expect(result).toEqual({ id: "import-1", importNumber: 1 })
  })

  it("throws when the enriched record cannot be read back", async () => {
    getImportByIdMock.mockResolvedValue(null)
    await expect(createImportUseCase(validInput(), ACTOR)).rejects.toThrow(
      /disappeared immediately after create/,
    )
  })
})
