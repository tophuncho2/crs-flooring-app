import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getWarehouseByIdMock,
  warehouseNameExistsMock,
  updateWarehouseMock,
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
    getWarehouseByIdMock: vi.fn(),
    warehouseNameExistsMock: vi.fn(),
    updateWarehouseMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  isP2002: (err: { code?: string; meta?: { target?: string[] } }, field: string) =>
    err?.code === "P2002" && (err?.meta?.target?.includes?.(field) ?? false),
  withDatabaseTransaction: withDatabaseTransactionMock,
  getWarehouseById: getWarehouseByIdMock,
  warehouseNameExists: warehouseNameExistsMock,
  updateWarehouse: updateWarehouseMock,
}))

import { updateWarehouseUseCase } from "../../../src/flooring/warehouses/update-warehouse.js"
import { WarehouseExecutionError } from "../../../src/flooring/warehouses/errors.js"

const ID = "wh-1"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getWarehouseByIdMock.mockReset()
  warehouseNameExistsMock.mockReset()
  updateWarehouseMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  getWarehouseByIdMock.mockResolvedValue({ id: ID, name: "Main Depot" })
  warehouseNameExistsMock.mockResolvedValue(false)
  updateWarehouseMock.mockResolvedValue({ id: ID, name: "Renamed Depot" })
})

describe("updateWarehouseUseCase", () => {
  it("throws 404 when the warehouse does not exist and never updates", async () => {
    getWarehouseByIdMock.mockResolvedValue(null)
    await expect(updateWarehouseUseCase(ID, { name: "Renamed Depot" })).rejects.toMatchObject({
      code: "WAREHOUSE_NOT_FOUND",
      status: 404,
    })
    expect(warehouseNameExistsMock).not.toHaveBeenCalled()
    expect(updateWarehouseMock).not.toHaveBeenCalled()
  })

  it("checks name uniqueness excluding the current id", async () => {
    await updateWarehouseUseCase(ID, { name: "Renamed Depot" })
    expect(warehouseNameExistsMock).toHaveBeenCalledWith(
      "Renamed Depot",
      expect.objectContaining({ excludeId: ID }),
    )
  })

  it("skips the uniqueness check when the name is not being changed", async () => {
    await updateWarehouseUseCase(ID, { city: "Dallas" })
    expect(warehouseNameExistsMock).not.toHaveBeenCalled()
    expect(updateWarehouseMock).toHaveBeenCalledWith(ID, { city: "Dallas" }, expect.anything())
  })

  it("rejects a duplicate name with 409 before updating", async () => {
    warehouseNameExistsMock.mockResolvedValue(true)
    await expect(updateWarehouseUseCase(ID, { name: "Renamed Depot" })).rejects.toMatchObject({
      code: "WAREHOUSE_NAME_CONFLICT",
      status: 409,
    })
    expect(updateWarehouseMock).not.toHaveBeenCalled()
  })

  it("maps a P2002 name violation on update to a 409 conflict", async () => {
    updateWarehouseMock.mockRejectedValue(
      new PrismaKnownError("dup", { code: "P2002", meta: { target: ["name"] } }),
    )
    await expect(updateWarehouseUseCase(ID, { name: "Renamed Depot" })).rejects.toMatchObject({
      code: "WAREHOUSE_NAME_CONFLICT",
      status: 409,
    })
  })

  it("returns the updated record on success", async () => {
    const updated = { id: ID, name: "Renamed Depot" }
    updateWarehouseMock.mockResolvedValue(updated)
    expect(await updateWarehouseUseCase(ID, { name: "Renamed Depot" })).toBe(updated)
  })

  it("re-throws unexpected database errors unchanged", async () => {
    updateWarehouseMock.mockRejectedValue(new Error("boom"))
    await expect(updateWarehouseUseCase(ID, { name: "Renamed Depot" })).rejects.toThrowError("boom")
    await expect(updateWarehouseUseCase(ID, { name: "Renamed Depot" })).rejects.not.toBeInstanceOf(
      WarehouseExecutionError,
    )
  })
})
