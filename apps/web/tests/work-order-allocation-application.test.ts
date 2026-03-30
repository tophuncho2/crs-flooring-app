import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  refreshInventoryReservedStockCountsMock,
  applyManualAllocationChangeUseCaseMock,
  reconcileWorkOrderAllocationStatusesUseCaseMock,
  removeWorkOrderItemAllocationUseCaseMock,
  requestWorkOrderAutoAllocationUseCaseMock,
} = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  refreshInventoryReservedStockCountsMock: vi.fn(),
  applyManualAllocationChangeUseCaseMock: vi.fn(),
  reconcileWorkOrderAllocationStatusesUseCaseMock: vi.fn(),
  removeWorkOrderItemAllocationUseCaseMock: vi.fn(),
  requestWorkOrderAutoAllocationUseCaseMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  db: {
    flooringWorkOrder: {
      findUniqueOrThrow: vi.fn(),
    },
  },
  withDatabaseTransaction: withDatabaseTransactionMock,
  refreshInventoryReservedStockCounts: refreshInventoryReservedStockCountsMock,
  listWorkOrderItemAllocationRows: vi.fn(),
  listInventoryAllocationCandidateRowsForWorkOrderItem: vi.fn(),
  listInventoryAllocationCandidateRowsForWorkOrderProduct: vi.fn(),
  findWorkOrderAllocationRunRowBySourceVersion: vi.fn(),
  findActiveWorkOrderAllocationRunRow: vi.fn(),
  getWorkOrderAllocationRunRowById: vi.fn(),
}))

vi.mock("@builders/execution", () => ({
  applyManualAllocationChangeUseCase: applyManualAllocationChangeUseCaseMock,
  reconcileWorkOrderAllocationStatusesUseCase: reconcileWorkOrderAllocationStatusesUseCaseMock,
  removeWorkOrderItemAllocationUseCase: removeWorkOrderItemAllocationUseCaseMock,
  requestWorkOrderAutoAllocationUseCase: requestWorkOrderAutoAllocationUseCaseMock,
  mapWorkOrderItemAllocationRowToRecord: (value: unknown) => value,
  mapInventoryAllocationCandidateRowToOptionRecord: (value: unknown) => value,
  mapWorkOrderAllocationRunRowToRecord: (value: unknown) => value,
  isWorkOrderAllocationExecutionError: () => false,
}))

import {
  createWorkOrderItemAllocationUseCase,
  deleteWorkOrderItemAllocationUseCase,
} from "@/features/flooring/work-orders/application/allocations"

describe("work order allocation application", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withDatabaseTransactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({ tx: "db-transaction" }),
    )
    refreshInventoryReservedStockCountsMock.mockResolvedValue(undefined)
    reconcileWorkOrderAllocationStatusesUseCaseMock.mockResolvedValue(undefined)
    removeWorkOrderItemAllocationUseCaseMock.mockResolvedValue({
      touchedInventoryIds: ["inv-1"],
    })
    requestWorkOrderAutoAllocationUseCaseMock.mockResolvedValue(undefined)
  })

  it("refreshes reservations and reconciles status after creating an allocation", async () => {
    applyManualAllocationChangeUseCaseMock.mockResolvedValue({
      allocation: { id: "alloc-1" },
      touchedInventoryIds: ["inv-1", "inv-2", "inv-1"],
    })

    const result = await createWorkOrderItemAllocationUseCase({
      workOrderId: "wo-1",
      workOrderItemId: "item-1",
      inventoryId: "inv-1",
      quantity: { toString: () => "4" } as never,
      cutSize: "12ft",
    })

    expect(result).toEqual({ id: "alloc-1" })
    expect(applyManualAllocationChangeUseCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workOrderId: "wo-1",
        workOrderItemId: "item-1",
        inventoryId: "inv-1",
      }),
      { tx: "db-transaction" },
    )
    expect(refreshInventoryReservedStockCountsMock).toHaveBeenCalledWith(["inv-1", "inv-2"], {
      tx: "db-transaction",
    })
    expect(reconcileWorkOrderAllocationStatusesUseCaseMock).toHaveBeenCalledWith("wo-1", {
      tx: "db-transaction",
    })
  })

  it("refreshes reservations and reconciles status after deleting an allocation", async () => {
    await deleteWorkOrderItemAllocationUseCase({
      workOrderId: "wo-1",
      workOrderItemId: "item-1",
      allocationId: "alloc-1",
    })

    expect(removeWorkOrderItemAllocationUseCaseMock).toHaveBeenCalledWith(
      {
        workOrderId: "wo-1",
        workOrderItemId: "item-1",
        allocationId: "alloc-1",
      },
      { tx: "db-transaction" },
    )
    expect(refreshInventoryReservedStockCountsMock).toHaveBeenCalledWith(["inv-1"], {
      tx: "db-transaction",
    })
    expect(reconcileWorkOrderAllocationStatusesUseCaseMock).toHaveBeenCalledWith("wo-1", {
      tx: "db-transaction",
    })
  })
})
