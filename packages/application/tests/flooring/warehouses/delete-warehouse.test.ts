import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, getWarehouseDeleteStateMock, deleteWarehouseByIdMock } =
  vi.hoisted(() => ({
    withDatabaseTransactionMock: vi.fn(),
    getWarehouseDeleteStateMock: vi.fn(),
    deleteWarehouseByIdMock: vi.fn(),
  }))

vi.mock("@builders/db", () => ({
  withDatabaseTransaction: withDatabaseTransactionMock,
  getWarehouseDeleteState: getWarehouseDeleteStateMock,
  deleteWarehouseById: deleteWarehouseByIdMock,
}))

import { deleteWarehouseUseCase } from "../../../src/flooring/warehouses/delete-warehouse.js"

const ID = "wh-1"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getWarehouseDeleteStateMock.mockReset()
  deleteWarehouseByIdMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  getWarehouseDeleteStateMock.mockResolvedValue(NO_DEPENDENTS)
  deleteWarehouseByIdMock.mockResolvedValue(undefined)
})

const NO_DEPENDENTS = {
  inventoriesCount: 0,
  importsCount: 0,
  inventoryAdjustmentsCount: 0,
  workOrdersCount: 0,
  templatesCount: 0,
}

describe("deleteWarehouseUseCase", () => {
  it("throws 404 when the warehouse does not exist and never deletes", async () => {
    getWarehouseDeleteStateMock.mockResolvedValue(null)
    await expect(deleteWarehouseUseCase(ID)).rejects.toMatchObject({
      code: "WAREHOUSE_NOT_FOUND",
      status: 404,
    })
    expect(deleteWarehouseByIdMock).not.toHaveBeenCalled()
  })

  it("blocks deletion with 409 when work orders are linked and never deletes", async () => {
    getWarehouseDeleteStateMock.mockResolvedValue({ ...NO_DEPENDENTS, workOrdersCount: 3 })
    await expect(deleteWarehouseUseCase(ID)).rejects.toMatchObject({
      code: "WAREHOUSE_IN_USE",
      status: 409,
      message: "Warehouse cannot be deleted while it has linked: work orders",
    })
    expect(deleteWarehouseByIdMock).not.toHaveBeenCalled()
  })

  it("blocks deletion with 409 when inventory is linked and never deletes", async () => {
    getWarehouseDeleteStateMock.mockResolvedValue({ ...NO_DEPENDENTS, inventoriesCount: 1 })
    await expect(deleteWarehouseUseCase(ID)).rejects.toMatchObject({
      code: "WAREHOUSE_IN_USE",
      status: 409,
      message: "Warehouse cannot be deleted while it has linked: inventory",
    })
    expect(deleteWarehouseByIdMock).not.toHaveBeenCalled()
  })

  it("deletes and returns ok when nothing is linked", async () => {
    expect(await deleteWarehouseUseCase(ID)).toEqual({ ok: true })
    expect(deleteWarehouseByIdMock).toHaveBeenCalledWith(ID, expect.anything())
  })
})
