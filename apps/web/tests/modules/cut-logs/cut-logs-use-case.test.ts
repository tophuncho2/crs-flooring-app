import { Prisma } from "@builders/db"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  createCutLogRecordMock,
  deleteCutLogRecordMock,
  getCutLogRebalanceStateMock,
  getCutLogTargetMock,
  getInventoryCutBalanceStateMock,
  listCutLogRecordsMock,
  updateCutLogBalanceRowsMock,
} = vi.hoisted(() => ({
  createCutLogRecordMock: vi.fn(),
  deleteCutLogRecordMock: vi.fn(),
  getCutLogRebalanceStateMock: vi.fn(),
  getCutLogTargetMock: vi.fn(),
  getInventoryCutBalanceStateMock: vi.fn(),
  listCutLogRecordsMock: vi.fn(),
  updateCutLogBalanceRowsMock: vi.fn(),
}))

vi.mock("@/modules/inventory/data/cut-logs", () => ({
  createCutLogRecord: createCutLogRecordMock,
  deleteCutLogRecord: deleteCutLogRecordMock,
  getCutLogRebalanceState: getCutLogRebalanceStateMock,
  getCutLogTarget: getCutLogTargetMock,
  getInventoryCutBalanceState: getInventoryCutBalanceStateMock,
  listCutLogRecords: listCutLogRecordsMock,
  updateCutLogBalanceRows: updateCutLogBalanceRowsMock,
}))

const { createCutLogUseCase } = await import("@/modules/inventory/application/cut-logs")

describe("createCutLogUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("blocks new cuts for pending import inventory rows", async () => {
    getInventoryCutBalanceStateMock.mockResolvedValue({
      id: "inv-1",
      importEntryId: "imp-1",
      importEntry: { status: "PENDING" },
      stockCount: new Prisma.Decimal(10),
      cutLogs: [],
    })

    await expect(createCutLogUseCase({
      inventoryId: "inv-1",
      quantityTaken: "2.00",
      notes: "",
    })).rejects.toMatchObject({
      message: "Pending import inventory cannot be cut until the import is marked Final.",
      status: 409,
    })

    expect(createCutLogRecordMock).not.toHaveBeenCalled()
  })

  it("allows valid cuts for final inventory rows", async () => {
    getInventoryCutBalanceStateMock.mockResolvedValue({
      id: "inv-1",
      importEntryId: "imp-1",
      importEntry: { status: "FINAL" },
      stockCount: new Prisma.Decimal(10),
      cutLogs: [],
    })
    createCutLogRecordMock.mockResolvedValue({
      id: "cut-1",
      inventoryId: "inv-1",
      before: new Prisma.Decimal(10),
      cut: new Prisma.Decimal(2),
      after: new Prisma.Decimal(8),
      notes: "Unit turn",
      createdAt: new Date("2026-03-24T00:00:00.000Z"),
      inventory: {
        id: "inv-1",
        itemNumber: "1001",
        product: {
          name: "Oak Plank",
          style: null,
          color: null,
        },
      },
    })

    const result = await createCutLogUseCase({
      inventoryId: "inv-1",
      quantityTaken: "2.00",
      notes: "Unit turn",
    })

    expect(result).toEqual(expect.objectContaining({
      id: "cut-1",
      cut: "2",
      after: "8",
    }))
    expect(createCutLogRecordMock.mock.calls[0]?.[0]?.before.toString()).toBe("10")
    expect(createCutLogRecordMock.mock.calls[0]?.[0]?.after.toString()).toBe("8")
  })

  it("still rejects cuts that exceed the running balance", async () => {
    getInventoryCutBalanceStateMock.mockResolvedValue({
      id: "inv-1",
      importEntryId: "",
      importEntry: null,
      stockCount: new Prisma.Decimal(10),
      cutLogs: [{ cut: new Prisma.Decimal(9) }],
    })

    await expect(createCutLogUseCase({
      inventoryId: "inv-1",
      quantityTaken: "2.00",
      notes: "",
    })).rejects.toMatchObject({
      message: "Quantity taken cannot exceed the current running balance",
      status: 400,
    })

    expect(createCutLogRecordMock).not.toHaveBeenCalled()
  })
})
