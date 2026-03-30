import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET as GET_ALLOCATIONS, POST as POST_ALLOCATIONS } from "@/app/api/flooring/work-orders/[id]/items/[itemId]/allocations/route"
import { DELETE as DELETE_ALLOCATION, PATCH as PATCH_ALLOCATION } from "@/app/api/flooring/work-orders/[id]/items/[itemId]/allocations/[allocationId]/route"
import { GET as GET_ALLOCATION_OPTIONS } from "@/app/api/flooring/work-orders/[id]/items/[itemId]/allocation-options/route"
import { GET as GET_AUTO_ALLOCATION, POST as POST_AUTO_ALLOCATION } from "@/app/api/flooring/work-orders/[id]/auto-allocation/route"

const WORK_ORDER_ID = "11111111-1111-4111-8111-111111111111"
const ITEM_ID = "22222222-2222-4222-8222-222222222222"
const ALLOCATION_ID = "33333333-3333-4333-8333-333333333333"
const RUN_ID = "44444444-4444-4444-8444-444444444444"

const {
  authorizeWorkOrdersRouteMock,
  requireRouteAccessMock,
  enforceRouteRateLimitMock,
  withMutationTelemetryMock,
  getAppMutationReceiptMock,
  reserveAppMutationReceiptMock,
  finalizeAppMutationReceiptMock,
  getWorkOrderByIdMock,
  listWorkOrderItemAllocationsUseCaseMock,
  createWorkOrderItemAllocationUseCaseMock,
  updateWorkOrderItemAllocationUseCaseMock,
  deleteWorkOrderItemAllocationUseCaseMock,
  listInventoryAllocationOptionsUseCaseMock,
  getWorkOrderAutoAllocationStatusUseCaseMock,
  requestWorkOrderAutoAllocationUseCaseMock,
} = vi.hoisted(() => ({
  authorizeWorkOrdersRouteMock: vi.fn(),
  requireRouteAccessMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
  getAppMutationReceiptMock: vi.fn(),
  reserveAppMutationReceiptMock: vi.fn(),
  finalizeAppMutationReceiptMock: vi.fn(),
  getWorkOrderByIdMock: vi.fn(),
  listWorkOrderItemAllocationsUseCaseMock: vi.fn(),
  createWorkOrderItemAllocationUseCaseMock: vi.fn(),
  updateWorkOrderItemAllocationUseCaseMock: vi.fn(),
  deleteWorkOrderItemAllocationUseCaseMock: vi.fn(),
  listInventoryAllocationOptionsUseCaseMock: vi.fn(),
  getWorkOrderAutoAllocationStatusUseCaseMock: vi.fn(),
  requestWorkOrderAutoAllocationUseCaseMock: vi.fn(),
}))

vi.mock("@builders/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@builders/db")>()
  return {
    ...actual,
    getAppMutationReceipt: getAppMutationReceiptMock,
    reserveAppMutationReceipt: reserveAppMutationReceiptMock,
    finalizeAppMutationReceipt: finalizeAppMutationReceiptMock,
  }
})

vi.mock("@/features/flooring/shared/access/templates-work-orders", () => ({
  authorizeWorkOrdersRoute: authorizeWorkOrdersRouteMock,
}))

vi.mock("@/features/flooring/shared/application/mutation-telemetry", () => ({
  withMutationTelemetry: withMutationTelemetryMock,
}))

vi.mock("@/server/http/route-helpers", () => ({
  requireRouteAccess: requireRouteAccessMock,
  enforceRouteRateLimit: enforceRouteRateLimitMock,
  routeJson: (_access: unknown, body: unknown, init?: ResponseInit) => Response.json(body, init),
  routeError: (_access: unknown, error: unknown) => {
    const maybeError = error as { message?: unknown; status?: unknown; field?: unknown; kind?: unknown }
    const payload: Record<string, unknown> = {
      error: typeof maybeError.message === "string" ? maybeError.message : "Unexpected server error",
    }

    if (typeof maybeError.field === "string") {
      payload.field = maybeError.field
    }

    return Response.json(payload, {
      status:
        typeof maybeError.status === "number"
          ? maybeError.status
          : maybeError.kind === "app" || typeof maybeError.field === "string"
            ? 400
            : 500,
    })
  },
}))

vi.mock("@/features/flooring/work-orders/application/allocations", () => ({
  listWorkOrderItemAllocationsUseCase: listWorkOrderItemAllocationsUseCaseMock,
  createWorkOrderItemAllocationUseCase: createWorkOrderItemAllocationUseCaseMock,
  updateWorkOrderItemAllocationUseCase: updateWorkOrderItemAllocationUseCaseMock,
  deleteWorkOrderItemAllocationUseCase: deleteWorkOrderItemAllocationUseCaseMock,
  listInventoryAllocationOptionsUseCase: listInventoryAllocationOptionsUseCaseMock,
  getWorkOrderAutoAllocationStatusUseCase: getWorkOrderAutoAllocationStatusUseCaseMock,
  requestWorkOrderAutoAllocationUseCase: requestWorkOrderAutoAllocationUseCaseMock,
}))

vi.mock("@/features/flooring/work-orders/queries", () => ({
  getWorkOrderById: getWorkOrderByIdMock,
}))

vi.mock("@/features/flooring/work-orders/transport/detail", () => ({
  withWorkOrderCapabilities: (workOrder: Record<string, unknown>) => ({
    ...workOrder,
    capabilities: {
      canWrite: true,
      canDelete: true,
      canAllocate: true,
      canSyncTemplate: true,
    },
  }),
}))

function allocationRow() {
  return {
    id: ALLOCATION_ID,
    workOrderItemId: ITEM_ID,
    inventoryId: "inv-1",
    quantity: "4",
    cutSize: "12ft",
    unitCost: "2.50",
    totalCost: 10,
    method: "MANUAL" as const,
    notes: "",
    createdAt: "2026-03-27T00:00:00.000Z",
    updatedAt: "2026-03-27T00:00:00.000Z",
    inventory: {
      itemNumber: "INV-100",
      dyeLot: "D1",
      locationCode: "A-1",
      warehouseName: "Main",
      stockUnit: "SF",
    },
  }
}

function allocationRun() {
  return {
    id: RUN_ID,
    workOrderId: WORK_ORDER_ID,
    requestedByUserId: "user-1",
    sourceVersion: "2026-03-27T00:00:00.000Z",
    idempotencyKey: "allocation:v1:run-1",
    status: "REQUESTED" as const,
    requestId: "req-1",
    queueJobId: null,
    requestedAt: "2026-03-27T00:00:00.000Z",
    queuedAt: null,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    failureCode: null,
    failureMessage: null,
    allocatedRowCount: 0,
    shortageCount: 0,
  }
}

describe("work-order allocation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeWorkOrdersRouteMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: { id: "user-1", email: "owner@test.com", role: "OWNER" },
    })
    requireRouteAccessMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: { id: "user-1", email: "owner@test.com", role: "OWNER" },
    })
    enforceRouteRateLimitMock.mockResolvedValue(null)
    getAppMutationReceiptMock.mockResolvedValue(null)
    reserveAppMutationReceiptMock.mockResolvedValue(undefined)
    finalizeAppMutationReceiptMock.mockResolvedValue(undefined)
    getWorkOrderByIdMock.mockResolvedValue({
      id: WORK_ORDER_ID,
      updatedAt: "2026-03-27T00:00:00.000Z",
      items: [
        {
          id: ITEM_ID,
          updatedAt: "2026-03-27T00:00:00.000Z",
          allocations: [allocationRow()],
        },
      ],
      serviceItems: [],
      salesReps: [],
    })
    withMutationTelemetryMock.mockImplementation(
      async (_access: unknown, _metadata: unknown, callback: () => Promise<unknown>) => callback(),
    )
  })

  it("lists and creates allocations", async () => {
    listWorkOrderItemAllocationsUseCaseMock.mockResolvedValue([allocationRow()])
    createWorkOrderItemAllocationUseCaseMock.mockResolvedValue(allocationRow())

    const listResponse = await GET_ALLOCATIONS(
      new Request(`http://localhost/api/flooring/work-orders/${WORK_ORDER_ID}/items/${ITEM_ID}/allocations`),
      { params: Promise.resolve({ id: WORK_ORDER_ID, itemId: ITEM_ID }) },
    )
    expect((await listResponse.json()).allocations).toHaveLength(1)

    const createResponse = await POST_ALLOCATIONS(
      new Request(`http://localhost/api/flooring/work-orders/${WORK_ORDER_ID}/items/${ITEM_ID}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: "inv-1",
          quantity: "4",
          cutSize: "12ft",
          mutation: { idempotencyKey: "allocation-create-1" },
        }),
      }),
      { params: Promise.resolve({ id: WORK_ORDER_ID, itemId: ITEM_ID }) },
    )

    expect(createResponse.status).toBe(201)
    expect(createWorkOrderItemAllocationUseCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workOrderId: WORK_ORDER_ID,
        workOrderItemId: ITEM_ID,
        inventoryId: "inv-1",
      }),
    )
  })

  it("returns field metadata for invalid allocation quantity", async () => {
    const response = await POST_ALLOCATIONS(
      new Request(`http://localhost/api/flooring/work-orders/${WORK_ORDER_ID}/items/${ITEM_ID}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: "inv-1",
          quantity: "0",
          mutation: { idempotencyKey: "allocation-create-2" },
        }),
      }),
      { params: Promise.resolve({ id: WORK_ORDER_ID, itemId: ITEM_ID }) },
    )

    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("quantity must be greater than 0")
    expect(payload.field).toBe("quantity")
  })

  it("updates and deletes allocations", async () => {
    updateWorkOrderItemAllocationUseCaseMock.mockResolvedValue({
      ...allocationRow(),
      quantity: "5",
      totalCost: 12.5,
    })

    const patchResponse = await PATCH_ALLOCATION(
      new Request(`http://localhost/api/flooring/work-orders/${WORK_ORDER_ID}/items/${ITEM_ID}/allocations/${ALLOCATION_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: "5",
          mutation: {
            idempotencyKey: "allocation-update-1",
            expectedUpdatedAt: "2026-03-27T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: WORK_ORDER_ID, itemId: ITEM_ID, allocationId: ALLOCATION_ID }) },
    )

    expect((await patchResponse.json()).allocation).toEqual(expect.objectContaining({ id: ALLOCATION_ID, quantity: "5" }))

    const deleteResponse = await DELETE_ALLOCATION(
      new Request(`http://localhost/api/flooring/work-orders/${WORK_ORDER_ID}/items/${ITEM_ID}/allocations/${ALLOCATION_ID}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "allocation-delete-1",
            expectedUpdatedAt: "2026-03-27T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: WORK_ORDER_ID, itemId: ITEM_ID, allocationId: ALLOCATION_ID }) },
    )

    expect((await deleteResponse.json()).ok).toBe(true)
    expect(deleteWorkOrderItemAllocationUseCaseMock).toHaveBeenCalledWith({
      workOrderId: WORK_ORDER_ID,
      workOrderItemId: ITEM_ID,
      allocationId: ALLOCATION_ID,
    })
  })

  it("lists allocation options and auto-allocation status", async () => {
    listInventoryAllocationOptionsUseCaseMock.mockResolvedValue([
      {
        id: "inv-1",
        productId: "prod-1",
        warehouseId: "wh-1",
        warehouseName: "Main",
        fifoReceivedAt: "2026-03-27T00:00:00.000Z",
        itemNumber: "INV-100",
        dyeLot: "D1",
        locationCode: "A-1",
        stockUnit: "SF",
        stockCount: "20.00",
        cutTotal: 4,
        reservedStockCount: "3.00",
        totalAllocated: "3.00",
        unreservedTotal: "16.00",
        availableToAllocate: 13,
        pricePerUnit: 2.5,
        label: "A-1 / INV-100",
      },
    ])
    getWorkOrderAutoAllocationStatusUseCaseMock.mockResolvedValue(allocationRun())
    requestWorkOrderAutoAllocationUseCaseMock.mockResolvedValue(allocationRun())

    const optionsResponse = await GET_ALLOCATION_OPTIONS(
      new Request(`http://localhost/api/flooring/work-orders/${WORK_ORDER_ID}/items/${ITEM_ID}/allocation-options`),
      { params: Promise.resolve({ id: WORK_ORDER_ID, itemId: ITEM_ID }) },
    )
    expect((await optionsResponse.json()).options).toHaveLength(1)

    const statusResponse = await GET_AUTO_ALLOCATION(
      new Request(`http://localhost/api/flooring/work-orders/${WORK_ORDER_ID}/auto-allocation`),
      { params: Promise.resolve({ id: WORK_ORDER_ID }) },
    )
    expect((await statusResponse.json()).run).toEqual(expect.objectContaining({ id: RUN_ID }))

    const requestResponse = await POST_AUTO_ALLOCATION(
      new Request(`http://localhost/api/flooring/work-orders/${WORK_ORDER_ID}/auto-allocation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "auto-allocation-1",
            expectedUpdatedAt: "2026-03-27T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: WORK_ORDER_ID }) },
    )
    expect((await requestResponse.json()).run).toEqual(expect.objectContaining({ id: RUN_ID }))
    expect(requestWorkOrderAutoAllocationUseCaseMock).toHaveBeenCalledWith({
      workOrderId: WORK_ORDER_ID,
      triggeredByUserId: "user-1",
      requestId: "req-1",
    })
  })
})
