import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  warehouseNameExistsMock,
  getExistingWarehouseNumbersMock,
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
    getExistingWarehouseNumbersMock: vi.fn(),
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
  getExistingWarehouseNumbers: getExistingWarehouseNumbersMock,
  createWarehouse: createWarehouseMock,
}))

import { createWarehouseUseCase } from "../../../src/flooring/warehouses/create-warehouse.js"
import { WarehouseExecutionError } from "../../../src/flooring/warehouses/errors.js"

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
  getExistingWarehouseNumbersMock.mockReset()
  createWarehouseMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  warehouseNameExistsMock.mockResolvedValue(false)
  getExistingWarehouseNumbersMock.mockResolvedValue([])
  createWarehouseMock.mockResolvedValue({ id: "wh-1", number: 1, name: "Main Depot" })
})

describe("createWarehouseUseCase", () => {
  it("rejects a duplicate name with 409 before assigning a number or inserting", async () => {
    warehouseNameExistsMock.mockResolvedValue(true)
    await expect(createWarehouseUseCase(input() as never)).rejects.toMatchObject({
      code: "WAREHOUSE_NAME_CONFLICT",
      status: 409,
      field: "name",
    })
    expect(getExistingWarehouseNumbersMock).not.toHaveBeenCalled()
    expect(createWarehouseMock).not.toHaveBeenCalled()
  })

  it("assigns the next number from the existing set and returns the created record", async () => {
    getExistingWarehouseNumbersMock.mockResolvedValue([1, 2, 3])
    const created = { id: "wh-9", number: 4, name: "Main Depot" }
    createWarehouseMock.mockResolvedValue(created)

    const result = await createWarehouseUseCase(input() as never)

    expect(result).toBe(created)
    expect(createWarehouseMock).toHaveBeenCalledWith(
      expect.objectContaining({ number: 4, name: "Main Depot" }),
      expect.anything(),
    )
  })

  it("maps a P2002 name violation on insert to a 409 conflict", async () => {
    createWarehouseMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002", meta: { target: ["name"] } }),
    )
    await expect(createWarehouseUseCase(input() as never)).rejects.toMatchObject({
      code: "WAREHOUSE_NAME_CONFLICT",
      status: 409,
    })
  })

  it("retries once when the number races on the first attempt, then succeeds", async () => {
    const created = { id: "wh-9", number: 2, name: "Main Depot" }
    createWarehouseMock
      .mockRejectedValueOnce(
        new PrismaKnownError("dup", { code: "P2002", meta: { target: ["number"] } }),
      )
      .mockResolvedValueOnce(created)

    const result = await createWarehouseUseCase(input() as never)

    expect(result).toBe(created)
    expect(getExistingWarehouseNumbersMock).toHaveBeenCalledTimes(2)
    expect(createWarehouseMock).toHaveBeenCalledTimes(2)
  })

  it("gives up with WAREHOUSE_NUMBER_CONFLICT when the number races on both attempts", async () => {
    createWarehouseMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002", meta: { target: ["number"] } }),
    )
    await expect(createWarehouseUseCase(input() as never)).rejects.toMatchObject({
      code: "WAREHOUSE_NUMBER_CONFLICT",
      status: 409,
    })
    expect(createWarehouseMock).toHaveBeenCalledTimes(2)
  })

  it("re-throws unexpected database errors unchanged", async () => {
    createWarehouseMock.mockRejectedValue(new Error("boom"))
    await expect(createWarehouseUseCase(input() as never)).rejects.toThrowError("boom")
    await expect(createWarehouseUseCase(input() as never)).rejects.not.toBeInstanceOf(
      WarehouseExecutionError,
    )
  })
})
