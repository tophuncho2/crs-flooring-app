import { beforeEach, describe, expect, it, vi } from "vitest"
import { deleteServiceUseCase } from "@builders/application"

const {
  getServiceDeleteStateMock,
  deleteServiceRecordByIdMock,
} = vi.hoisted(() => ({
  getServiceDeleteStateMock: vi.fn(),
  deleteServiceRecordByIdMock: vi.fn(),
}))

vi.mock("@builders/db", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    getServiceDeleteState: getServiceDeleteStateMock,
    deleteServiceRecordById: deleteServiceRecordByIdMock,
  }
})

describe("services application", () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
