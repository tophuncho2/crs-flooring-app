import { beforeEach, describe, expect, it, vi } from "vitest"
import { deleteServiceEntry } from "@/features/flooring/services/application/manage-service"

const {
  getServiceDeleteStateMock,
  deleteServiceRecordByIdMock,
} = vi.hoisted(() => ({
  getServiceDeleteStateMock: vi.fn(),
  deleteServiceRecordByIdMock: vi.fn(),
}))

vi.mock("@/features/flooring/services/data/server-records", () => ({
  createServiceRecord: vi.fn(),
  updateServiceRecord: vi.fn(),
  getServiceDeleteState: getServiceDeleteStateMock,
  deleteServiceRecordById: deleteServiceRecordByIdMock,
}))

vi.mock("@/features/flooring/services/data/queries", () => ({
  getServiceById: vi.fn(),
}))

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

    await expect(deleteServiceEntry("svc-1")).rejects.toMatchObject({
      kind: "app",
      status: 409,
      message: "This service is linked to work orders and cannot be deleted",
    })

    expect(deleteServiceRecordByIdMock).not.toHaveBeenCalled()
  })
})
