import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  warehouseNameExistsMock,
  createWarehouseMock,
  PrismaKnownError,
} = vi.hoisted(() => {
  class PrismaKnownError extends Error {
    code: string
    meta?: { target?: string[] }
    constructor(message: string, opts: { code: string; meta?: { target?: string[] } }) {
      super(message)
      this.code = opts.code
      this.meta = opts.meta
    }
  }
  return {
    withDatabaseTransactionMock: vi.fn(),
    warehouseNameExistsMock: vi.fn(),
    createWarehouseMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  isP2002: (err: { code?: string; meta?: { target?: string[] } }, field: string) =>
    err?.code === "P2002" && (err?.meta?.target?.includes?.(field) ?? false),
  withDatabaseTransaction: withDatabaseTransactionMock,
  warehouseNameExists: warehouseNameExistsMock,
  createWarehouse: createWarehouseMock,
}))

import { createWarehouseUseCase } from "../../src/warehouses/create-warehouse.js"
import { WarehouseExecutionError } from "../../src/warehouses/errors.js"

const ACTOR = "user@x.com"

function input(overrides: Record<string, unknown> = {}) {
  return {
    name: "Main Depot",
    streetAddress: null,
    city: null,
    state: null,
    postalCode: null,
    phone: null,
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  warehouseNameExistsMock.mockReset()
  createWarehouseMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  warehouseNameExistsMock.mockResolvedValue(false)
  createWarehouseMock.mockResolvedValue({
    id: "wh-1",
    name: "Main Depot",
    createdBy: ACTOR,
    updatedBy: ACTOR,
  })
})

describe("createWarehouseUseCase", () => {
  it("rejects a duplicate name with 409 before inserting", async () => {
    warehouseNameExistsMock.mockResolvedValue(true)
    await expect(createWarehouseUseCase(input() as never, ACTOR)).rejects.toMatchObject({
      code: "WAREHOUSE_NAME_CONFLICT",
      status: 409,
      field: "name",
    })
    expect(createWarehouseMock).not.toHaveBeenCalled()
  })

  it("rejects a blank actor email and never inserts", async () => {
    await expect(createWarehouseUseCase(input() as never, "   ")).rejects.toThrowError(/actorEmail/)
    expect(createWarehouseMock).not.toHaveBeenCalled()
  })

  it("inserts the warehouse once and returns the created record", async () => {
    const created = { id: "wh-9", name: "Main Depot" }
    createWarehouseMock.mockResolvedValue(created)

    const result = await createWarehouseUseCase(input() as never, ACTOR)

    expect(result).toBe(created)
    expect(createWarehouseMock).toHaveBeenCalledTimes(1)
    expect(createWarehouseMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Main Depot" }),
      expect.anything(),
    )
  })

  it("stamps the actor email as createdBy and updatedBy on insert", async () => {
    await createWarehouseUseCase(input() as never, ACTOR)
    expect(createWarehouseMock).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: ACTOR, updatedBy: ACTOR }),
      expect.anything(),
    )
  })

  it("maps a P2002 name violation on insert to a 409 conflict", async () => {
    createWarehouseMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002", meta: { target: ["name"] } }),
    )
    await expect(createWarehouseUseCase(input() as never, ACTOR)).rejects.toMatchObject({
      code: "WAREHOUSE_NAME_CONFLICT",
      status: 409,
    })
  })

  it("re-throws unexpected database errors unchanged", async () => {
    createWarehouseMock.mockRejectedValue(new Error("boom"))
    await expect(createWarehouseUseCase(input() as never, ACTOR)).rejects.toThrowError("boom")
    await expect(createWarehouseUseCase(input() as never, ACTOR)).rejects.not.toBeInstanceOf(
      WarehouseExecutionError,
    )
  })
})
