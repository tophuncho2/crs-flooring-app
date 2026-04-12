import { beforeEach, describe, expect, it, vi } from "vitest"
import { deleteContactUseCase } from "@builders/application"

const {
  getContactDeleteStateMock,
  deleteContactRecordByIdMock,
  withDatabaseTransactionMock,
} = vi.hoisted(() => ({
  getContactDeleteStateMock: vi.fn(),
  deleteContactRecordByIdMock: vi.fn(),
  withDatabaseTransactionMock: vi.fn(),
}))

vi.mock("@builders/db", async () => {
  const actual = await vi.importActual<typeof import("@builders/db")>("@builders/db")
  return {
    ...actual,
    getContactDeleteState: getContactDeleteStateMock,
    deleteContactRecordById: deleteContactRecordByIdMock,
    withDatabaseTransaction: withDatabaseTransactionMock,
  }
})

describe("contacts application", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withDatabaseTransactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({}))
  })

  it("blocks deleting contacts linked to work orders before persistence runs", async () => {
    getContactDeleteStateMock.mockResolvedValue({
      id: "contact-1",
      _count: {
        templateSalesReps: 0,
        workOrderSalesReps: 2,
      },
    })

    await expect(deleteContactUseCase("contact-1")).rejects.toMatchObject({
      name: "ContactExecutionError",
      code: "CONTACT_IN_USE",
      status: 409,
      message: "This contact is linked to work orders and cannot be deleted",
    })

    expect(deleteContactRecordByIdMock).not.toHaveBeenCalled()
  })
})
