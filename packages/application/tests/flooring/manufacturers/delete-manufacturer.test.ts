import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, getManufacturerDeleteStateMock, deleteManufacturerRecordByIdMock } =
  vi.hoisted(() => ({
    withDatabaseTransactionMock: vi.fn(),
    getManufacturerDeleteStateMock: vi.fn(),
    deleteManufacturerRecordByIdMock: vi.fn(),
  }))

vi.mock("@builders/db", () => ({
  withDatabaseTransaction: withDatabaseTransactionMock,
  getManufacturerDeleteState: getManufacturerDeleteStateMock,
  deleteManufacturerRecordById: deleteManufacturerRecordByIdMock,
}))

import { deleteManufacturerUseCase } from "../../../src/flooring/manufacturers/delete-manufacturer.js"

const ID = "mfr-1"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getManufacturerDeleteStateMock.mockReset()
  deleteManufacturerRecordByIdMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  getManufacturerDeleteStateMock.mockResolvedValue({ id: ID, _count: { products: 0 } })
  deleteManufacturerRecordByIdMock.mockResolvedValue(undefined)
})

describe("deleteManufacturerUseCase", () => {
  it("throws 404 when the manufacturer does not exist and never deletes", async () => {
    getManufacturerDeleteStateMock.mockResolvedValue(null)
    await expect(deleteManufacturerUseCase(ID)).rejects.toMatchObject({
      code: "MANUFACTURER_NOT_FOUND",
      status: 404,
    })
    expect(deleteManufacturerRecordByIdMock).not.toHaveBeenCalled()
  })

  it("blocks deletion with 409 when products are linked and never deletes", async () => {
    getManufacturerDeleteStateMock.mockResolvedValue({ id: ID, _count: { products: 5 } })
    await expect(deleteManufacturerUseCase(ID)).rejects.toMatchObject({
      code: "MANUFACTURER_IN_USE",
      status: 409,
    })
    expect(deleteManufacturerRecordByIdMock).not.toHaveBeenCalled()
  })

  it("deletes and returns ok when no products are linked", async () => {
    expect(await deleteManufacturerUseCase(ID)).toEqual({ ok: true })
    expect(deleteManufacturerRecordByIdMock).toHaveBeenCalledWith(ID, expect.anything())
  })
})
