import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, FakeDecimal } = vi.hoisted(() => {
  class HoistedFakeDecimal {
    private readonly value: string

    constructor(value: string | number) {
      this.value = String(value)
    }

    toString() {
      return this.value
    }
  }

  return {
    withDatabaseTransactionMock: vi.fn(),
    FakeDecimal: HoistedFakeDecimal,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {
    Decimal: FakeDecimal,
  },
  withDatabaseTransaction: withDatabaseTransactionMock,
}))

import { createWorkOrderAutoAllocationProcessor } from "../src/processors/process-work-order-auto-allocation.js"

describe("createWorkOrderAutoAllocationProcessor", () => {
  const env = {
    queueRedisUrl: "redis://localhost:6379",
    invoiceWorkerConcurrency: 2,
    invoiceWorkerLockDurationMs: 300000,
    autoAllocationWorkerConcurrency: 2,
    autoAllocationWorkerLockDurationMs: 300000,
    environmentName: "test",
    serviceName: "worker",
    storage: {
      accessKeyId: "key",
      defaultRegion: "us-east-1",
      endpointUrl: "https://storage.example.com",
      bucketName: "builders",
      secretAccessKey: "secret",
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    withDatabaseTransactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        flooringWorkOrder: {
          update: vi.fn().mockResolvedValue(undefined),
        },
      }),
    )
  })

  it("allocates FIFO inventory, preserves manual rows, and records shortages all-or-nothing per item", async () => {
    const createAllocation = vi.fn().mockResolvedValue(undefined)
    const completeAllocationRun = vi.fn().mockResolvedValue(true)
    const updateItemShortageStatuses = vi.fn().mockResolvedValue(undefined)
    const processor = createWorkOrderAutoAllocationProcessor({
      getAllocationRun: vi.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        workOrderId: "22222222-2222-4222-8222-222222222222",
        requestedByUserId: "33333333-3333-4333-8333-333333333333",
        sourceVersion: "2026-03-27T00:00:00.000Z",
        idempotencyKey: "work-order-allocation:v2:22222222-2222-4222-8222-222222222222:2026-03-27T00:00:00.000Z",
        status: "QUEUED",
        requestId: "req-1",
        queueJobId: "work-order-allocation:v2:22222222-2222-4222-8222-222222222222:2026-03-27T00:00:00.000Z",
        requestedAt: "2026-03-27T00:00:00.000Z",
        queuedAt: "2026-03-27T00:00:01.000Z",
        startedAt: null,
        completedAt: null,
        failedAt: null,
        failureCode: null,
        failureMessage: null,
        allocatedRowCount: 0,
        shortageCount: 0,
      }),
      startAllocationRun: vi.fn().mockResolvedValue(true),
      retryAllocationRun: vi.fn(),
      failAllocationRun: vi.fn(),
      supersedeAllocationRun: vi.fn(),
      completeAllocationRun,
      deleteAutoAllocationsForWorkOrder: vi.fn().mockResolvedValue(undefined),
      createAllocation,
      updateItemShortageStatuses,
      getAllocationSource: vi.fn().mockResolvedValue({
        allocationRun: {
          id: "11111111-1111-4111-8111-111111111111",
        },
        workOrder: {
          id: "22222222-2222-4222-8222-222222222222",
          warehouseId: "wh-1",
          sourceVersion: "2026-03-27T00:00:00.000Z",
        },
        items: [
          {
            id: "item-1",
            productId: "prod-1",
            quantity: "8",
            manualAllocations: [
              {
                id: "manual-1",
                workOrderItemId: "item-1",
                inventoryId: "inv-manual",
                quantity: "2",
                unitCost: "1.25",
                totalCost: 2.5,
                cutSize: "",
                method: "MANUAL",
                notes: "",
                createdAt: "2026-03-27T00:00:00.000Z",
                updatedAt: "2026-03-27T00:00:00.000Z",
                inventory: {
                  itemNumber: "INV-MANUAL",
                  dyeLot: "",
                  locationCode: "A-0",
                  warehouseName: "Main",
                  stockUnit: "SF",
                },
              },
            ],
            autoAllocations: [],
          },
          {
            id: "item-2",
            productId: "prod-2",
            quantity: "6",
            manualAllocations: [],
            autoAllocations: [],
          },
        ],
        inventoryCandidates: [
          {
            id: "inv-1",
            productId: "prod-1",
            warehouseId: "wh-1",
            warehouseName: "Main",
            fifoReceivedAt: "2026-03-26T00:00:00.000Z",
            itemNumber: "INV-100",
            dyeLot: "",
            locationCode: "A-1",
            stockUnit: "SF",
            stockCount: "10.00",
            cutTotal: 0,
            reservedStockCount: "0.00",
            availableToAllocate: 3,
            pricePerUnit: 2.5,
            label: "A-1 / INV-100",
          },
          {
            id: "inv-2",
            productId: "prod-1",
            warehouseId: "wh-1",
            warehouseName: "Main",
            fifoReceivedAt: "2026-03-27T00:00:00.000Z",
            itemNumber: "INV-101",
            dyeLot: "",
            locationCode: "A-2",
            stockUnit: "SF",
            stockCount: "10.00",
            cutTotal: 0,
            reservedStockCount: "0.00",
            availableToAllocate: 6,
            pricePerUnit: 2.75,
            label: "A-2 / INV-101",
          },
          {
            id: "inv-3",
            productId: "prod-2",
            warehouseId: "wh-1",
            warehouseName: "Main",
            fifoReceivedAt: "2026-03-25T00:00:00.000Z",
            itemNumber: "INV-200",
            dyeLot: "",
            locationCode: "B-1",
            stockUnit: "SF",
            stockCount: "10.00",
            cutTotal: 0,
            reservedStockCount: "0.00",
            availableToAllocate: 4,
            pricePerUnit: 3,
            label: "B-1 / INV-200",
          },
        ],
      }),
    })

    const result = await processor({
      version: "v1",
      jobName: "auto-allocate-work-order",
      requestId: "req-1",
      allocationRunId: "11111111-1111-4111-8111-111111111111",
      workOrderId: "22222222-2222-4222-8222-222222222222",
      requestedByUserId: "33333333-3333-4333-8333-333333333333",
      idempotencyKey: "work-order-allocation:v2:22222222-2222-4222-8222-222222222222:2026-03-27T00:00:00.000Z",
      sourceVersion: "2026-03-27T00:00:00.000Z",
      queuedAt: "2026-03-27T00:00:01.000Z",
    }, env as never)

    expect(result).toEqual({
      status: "completed",
      allocatedRowCount: 3,
      shortageCount: 1,
    })
    expect(createAllocation).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        workOrderItemId: "item-1",
        inventoryId: "inv-1",
        method: "AUTO",
      }),
      expect.any(Object),
    )
    expect(createAllocation).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        workOrderItemId: "item-1",
        inventoryId: "inv-2",
        method: "AUTO",
      }),
      expect.any(Object),
    )
    expect(createAllocation).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        workOrderItemId: "item-2",
        inventoryId: "inv-3",
        method: "AUTO",
      }),
      expect.any(Object),
    )
    expect(updateItemShortageStatuses).toHaveBeenCalledWith(
      {
        workOrderId: "22222222-2222-4222-8222-222222222222",
        shortageItemIds: ["item-2"],
      },
      expect.any(Object),
    )
    expect(completeAllocationRun).toHaveBeenCalledWith({
      allocationRunId: "11111111-1111-4111-8111-111111111111",
      allocatedRowCount: 3,
      shortageCount: 1,
    }, expect.any(Object))
  })

  it("supersedes the run when the work-order source changed after the request", async () => {
    const failAllocationRun = vi.fn().mockResolvedValue(true)
    const supersedeAllocationRun = vi.fn().mockResolvedValue(true)
    const processor = createWorkOrderAutoAllocationProcessor({
      getAllocationRun: vi.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        workOrderId: "22222222-2222-4222-8222-222222222222",
        requestedByUserId: "33333333-3333-4333-8333-333333333333",
        sourceVersion: "2026-03-27T00:00:00.000Z",
        idempotencyKey: "work-order-allocation:v2:22222222-2222-4222-8222-222222222222:2026-03-27T00:00:00.000Z",
        status: "QUEUED",
        requestId: "req-1",
        queueJobId: "work-order-allocation:v2:22222222-2222-4222-8222-222222222222:2026-03-27T00:00:00.000Z",
        requestedAt: "2026-03-27T00:00:00.000Z",
        queuedAt: "2026-03-27T00:00:01.000Z",
        startedAt: null,
        completedAt: null,
        failedAt: null,
        failureCode: null,
        failureMessage: null,
        allocatedRowCount: 0,
        shortageCount: 0,
      }),
      startAllocationRun: vi.fn().mockResolvedValue(true),
      retryAllocationRun: vi.fn(),
      failAllocationRun,
      supersedeAllocationRun,
      completeAllocationRun: vi.fn(),
      deleteAutoAllocationsForWorkOrder: vi.fn().mockResolvedValue(undefined),
      createAllocation: vi.fn(),
      updateItemShortageStatuses: vi.fn(),
      getAllocationSource: vi.fn().mockResolvedValue({
        allocationRun: {
          id: "11111111-1111-4111-8111-111111111111",
        },
        workOrder: {
          id: "22222222-2222-4222-8222-222222222222",
          warehouseId: "wh-1",
          sourceVersion: "2026-03-27T00:05:00.000Z",
        },
        items: [],
        inventoryCandidates: [],
      }),
    })

    await expect(processor({
      version: "v1",
      jobName: "auto-allocate-work-order",
      requestId: "req-1",
      allocationRunId: "11111111-1111-4111-8111-111111111111",
      workOrderId: "22222222-2222-4222-8222-222222222222",
      requestedByUserId: "33333333-3333-4333-8333-333333333333",
      idempotencyKey: "work-order-allocation:v2:22222222-2222-4222-8222-222222222222:2026-03-27T00:00:00.000Z",
      sourceVersion: "2026-03-27T00:00:00.000Z",
      queuedAt: "2026-03-27T00:00:01.000Z",
    }, env as never)).resolves.toEqual({
      status: "superseded",
      reason: "AUTO_ALLOCATION_SUPERSEDED",
    })

    expect(supersedeAllocationRun).toHaveBeenCalledWith({
      allocationRunId: "11111111-1111-4111-8111-111111111111",
    })
    expect(failAllocationRun).not.toHaveBeenCalled()
  })
})
