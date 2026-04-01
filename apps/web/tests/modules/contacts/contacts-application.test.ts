import { beforeEach, describe, expect, it, vi } from "vitest"
import { deleteContactEntry } from "@/modules/contacts/application/manage-contact"

const {
  getContactDeleteStateMock,
  deleteContactRecordByIdMock,
} = vi.hoisted(() => ({
  getContactDeleteStateMock: vi.fn(),
  deleteContactRecordByIdMock: vi.fn(),
}))

vi.mock("@/modules/contacts/data/server-records", () => ({
  createContactRecord: vi.fn(),
  updateContactRecord: vi.fn(),
  getContactDeleteState: getContactDeleteStateMock,
  deleteContactRecordById: deleteContactRecordByIdMock,
}))

describe("contacts application", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("blocks deleting contacts linked to work orders before persistence runs", async () => {
    getContactDeleteStateMock.mockResolvedValue({
      id: "contact-1",
      _count: {
        templateSalesReps: 0,
        workOrderSalesReps: 2,
      },
    })

    await expect(deleteContactEntry("contact-1")).rejects.toMatchObject({
      kind: "app",
      status: 409,
      message: "This contact is linked to work orders and cannot be deleted",
    })

    expect(deleteContactRecordByIdMock).not.toHaveBeenCalled()
  })
})
