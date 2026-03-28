import { describe, expect, it } from "vitest"
import {
  buildInventoryAllocationTotals,
  buildWorkOrderAllocationPlan,
  buildWorkOrderAllocationWorkflowSummary,
  buildWorkOrderItemAllocationSummary,
  determineWorkOrderMaterialAllocationStatus,
} from "@builders/domain"

describe("work order allocation domain", () => {
  it("allocates FIFO within the same warehouse and same product", () => {
    const plan = buildWorkOrderAllocationPlan({
      warehouseId: "wh-1",
      items: [
        {
          id: "item-1",
          productId: "prod-1",
          requiredQuantity: 6,
          allocatedQuantity: 0,
        },
      ],
      candidates: [
        {
          id: "inv-other-warehouse",
          productId: "prod-1",
          warehouseId: "wh-2",
          availableQuantity: 100,
          fifoReceivedAt: "2026-03-20T00:00:00.000Z",
          itemNumber: "A-000",
        },
        {
          id: "inv-other-product",
          productId: "prod-2",
          warehouseId: "wh-1",
          availableQuantity: 100,
          fifoReceivedAt: "2026-03-19T00:00:00.000Z",
          itemNumber: "A-001",
        },
        {
          id: "inv-2",
          productId: "prod-1",
          warehouseId: "wh-1",
          availableQuantity: 5,
          fifoReceivedAt: "2026-03-22T00:00:00.000Z",
          itemNumber: "A-002",
        },
        {
          id: "inv-1",
          productId: "prod-1",
          warehouseId: "wh-1",
          availableQuantity: 4,
          fifoReceivedAt: "2026-03-21T00:00:00.000Z",
          itemNumber: "A-003",
        },
      ],
    })

    expect(plan.rows).toEqual([
      { workOrderItemId: "item-1", inventoryId: "inv-1", quantity: 4 },
      { workOrderItemId: "item-1", inventoryId: "inv-2", quantity: 2 },
    ])
    expect(plan.shortages).toEqual([])
  })

  it("marks shortage only after allocation work is terminal and FIFO inventory is exhausted", () => {
    expect(
      determineWorkOrderMaterialAllocationStatus({
        requiredQuantity: 5,
        allocatedQuantity: 0,
        hasPendingAllocationRun: true,
        hasEligibleInventoryRemaining: false,
      }),
    ).toBe("NOT_STARTED")

    expect(
      buildWorkOrderItemAllocationSummary({
        requiredQuantity: 5,
        allocations: [{ quantity: 3, unitCost: 2 }],
        hasPendingAllocationRun: false,
        hasEligibleInventoryRemaining: false,
      }),
    ).toEqual({
      allocatedQuantity: 3,
      remainingQuantity: 2,
      materialExpense: 6,
      hasAllocationShortage: true,
      allocationStatus: "SHORTAGE",
      isDone: true,
    })
  })

  it("defines work order DONE only when every item is fully allocated or in shortage and no run is pending", () => {
    expect(
      buildWorkOrderAllocationWorkflowSummary({
        itemStatuses: ["FULLY_ALLOCATED", "SHORTAGE"],
        hasPendingRun: false,
      }),
    ).toEqual({
      hasPendingRun: false,
      isDone: true,
    })

    expect(
      buildWorkOrderAllocationWorkflowSummary({
        itemStatuses: ["FULLY_ALLOCATED", "PARTIALLY_ALLOCATED"],
        hasPendingRun: false,
      }),
    ).toEqual({
      hasPendingRun: false,
      isDone: false,
    })

    expect(
      buildWorkOrderAllocationWorkflowSummary({
        itemStatuses: ["FULLY_ALLOCATED", "SHORTAGE"],
        hasPendingRun: true,
      }),
    ).toEqual({
      hasPendingRun: true,
      isDone: false,
    })
  })

  it("derives inventory allocation totals in one shared place", () => {
    expect(
      buildInventoryAllocationTotals({
        stockCount: 20,
        cutTotal: 4,
        reservedStockCount: 3,
      }),
    ).toEqual({
      stockTotal: 20,
      cutTotal: 4,
      totalAllocated: 3,
      runningBalance: 16,
      unreservedTotal: 16,
      availableToAllocate: 13,
    })
  })
})
