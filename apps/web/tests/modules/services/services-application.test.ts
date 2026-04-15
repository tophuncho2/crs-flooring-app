import { beforeEach, describe, expect, it, vi } from "vitest"
import { createServiceUseCase, deleteServiceUseCase, updateServiceUseCase } from "@builders/application"

const {
  createServiceRecordMock,
  updateServiceRecordMock,
  getServiceByIdMock,
  getServiceDeleteStateMock,
  deleteServiceRecordByIdMock,
  withDatabaseTransactionMock,
} = vi.hoisted(() => ({
  createServiceRecordMock: vi.fn(),
  updateServiceRecordMock: vi.fn(),
  getServiceByIdMock: vi.fn(),
  getServiceDeleteStateMock: vi.fn(),
  deleteServiceRecordByIdMock: vi.fn(),
  withDatabaseTransactionMock: vi.fn(),
}))

vi.mock("@builders/db", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    createServiceRecord: createServiceRecordMock,
    updateServiceRecord: updateServiceRecordMock,
    getServiceById: getServiceByIdMock,
    getServiceDeleteState: getServiceDeleteStateMock,
    deleteServiceRecordById: deleteServiceRecordByIdMock,
    withDatabaseTransaction: withDatabaseTransactionMock,
  }
})

describe("services application", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withDatabaseTransactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({}))
  })

  it("blocks deleting services linked to work orders before persistence runs", async () => {
    getServiceDeleteStateMock.mockResolvedValue({
      id: "svc-1",
      _count: {
        templateItems: 0,
        workOrderItems: 1,
      },
    })

    await expect(deleteServiceUseCase("svc-1")).rejects.toMatchObject({
      code: "SERVICE_IN_USE",
      status: 409,
      message: "This service is linked to work orders and cannot be deleted",
    })

    expect(deleteServiceRecordByIdMock).not.toHaveBeenCalled()
  })

  it("createServiceUseCase persists and returns the normalized snapshot", async () => {
    const input = {
      name: "Install",
      unitId: "22222222-2222-4222-8222-222222222222",
      baseCost: "9.50",
      notes: null,
    }
    const created = { id: "svc-1" }
    const snapshot = {
      id: "svc-1",
      name: "Install",
      unitId: input.unitId,
      unitName: "Square Feet",
      baseCost: "9.5",
      notes: "",
      usageCount: 0,
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z",
    }
    createServiceRecordMock.mockResolvedValue(created)
    getServiceByIdMock.mockResolvedValue(snapshot)

    const result = await createServiceUseCase(input)

    expect(createServiceRecordMock).toHaveBeenCalledWith(input, expect.anything())
    expect(getServiceByIdMock).toHaveBeenCalledWith("svc-1", expect.anything())
    expect(result).toEqual(snapshot)
  })

  it("updateServiceUseCase persists and returns the normalized snapshot", async () => {
    const input = {
      name: "Repair",
      unitId: "22222222-2222-4222-8222-222222222222",
      baseCost: "12.00",
      notes: "Rush",
    }
    const snapshot = {
      id: "svc-1",
      name: "Repair",
      unitId: input.unitId,
      unitName: "Square Feet",
      baseCost: "12",
      notes: "Rush",
      usageCount: 3,
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z",
    }
    updateServiceRecordMock.mockResolvedValue(undefined)
    getServiceByIdMock.mockResolvedValue(snapshot)

    const result = await updateServiceUseCase("svc-1", input)

    expect(updateServiceRecordMock).toHaveBeenCalledWith("svc-1", input, expect.anything())
    expect(getServiceByIdMock).toHaveBeenCalledWith("svc-1", expect.anything())
    expect(result).toEqual(snapshot)
  })
})
