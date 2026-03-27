import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET as GET_ITEMS, POST as POST_ITEM } from "@/app/api/flooring/work-orders/[id]/items/route"
import { DELETE as DELETE_ITEM, PATCH as PATCH_ITEM } from "@/app/api/flooring/work-orders/[id]/items/[itemId]/route"
import { GET as GET_SERVICE_ITEMS, POST as POST_SERVICE_ITEM } from "@/app/api/flooring/work-orders/[id]/service-items/route"
import { DELETE as DELETE_SERVICE_ITEM, PATCH as PATCH_SERVICE_ITEM } from "@/app/api/flooring/work-orders/[id]/service-items/[itemId]/route"
import { GET as GET_SALES_REPS, POST as POST_SALES_REP } from "@/app/api/flooring/work-orders/[id]/sales-reps/route"
import { GET as GET_CALCULATIONS } from "@/app/api/flooring/work-orders/[id]/calculations/route"
import { DELETE as DELETE_SALES_REP, PATCH as PATCH_SALES_REP } from "@/app/api/flooring/work-orders/[id]/sales-reps/[repId]/route"

const {
  authorizeWorkOrdersRouteMock,
  enforceRouteRateLimitMock,
  logRouteMutationSuccessMock,
  logRouteMutationFailureMock,
  listWorkOrderItemsMock,
  createWorkOrderItemMock,
  updateWorkOrderItemMock,
  deleteWorkOrderItemMock,
  listWorkOrderServiceItemsMock,
  createWorkOrderServiceItemMock,
  updateWorkOrderServiceItemMock,
  deleteWorkOrderServiceItemMock,
  listWorkOrderSalesRepsMock,
  listWorkOrderCalculationRowsMock,
  createWorkOrderSalesRepMock,
  updateWorkOrderSalesRepMock,
  deleteWorkOrderSalesRepMock,
} = vi.hoisted(() => ({
  authorizeWorkOrdersRouteMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  logRouteMutationSuccessMock: vi.fn(),
  logRouteMutationFailureMock: vi.fn(),
  listWorkOrderItemsMock: vi.fn(),
  createWorkOrderItemMock: vi.fn(),
  updateWorkOrderItemMock: vi.fn(),
  deleteWorkOrderItemMock: vi.fn(),
  listWorkOrderServiceItemsMock: vi.fn(),
  createWorkOrderServiceItemMock: vi.fn(),
  updateWorkOrderServiceItemMock: vi.fn(),
  deleteWorkOrderServiceItemMock: vi.fn(),
  listWorkOrderSalesRepsMock: vi.fn(),
  listWorkOrderCalculationRowsMock: vi.fn(),
  createWorkOrderSalesRepMock: vi.fn(),
  updateWorkOrderSalesRepMock: vi.fn(),
  deleteWorkOrderSalesRepMock: vi.fn(),
}))

vi.mock("@/features/flooring/shared/access/templates-work-orders", () => ({
  authorizeWorkOrdersRoute: authorizeWorkOrdersRouteMock,
}))

vi.mock("@/server/http/route-helpers", () => ({
  enforceRouteRateLimit: enforceRouteRateLimitMock,
  logRouteMutationSuccess: logRouteMutationSuccessMock,
  logRouteMutationFailure: logRouteMutationFailureMock,
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

vi.mock("@/features/flooring/work-orders/queries", () => ({
  listWorkOrderItems: listWorkOrderItemsMock,
  listWorkOrderServiceItems: listWorkOrderServiceItemsMock,
  listWorkOrderSalesReps: listWorkOrderSalesRepsMock,
  listWorkOrderCalculationRows: listWorkOrderCalculationRowsMock,
}))

vi.mock("@/features/flooring/work-orders/mutations", () => ({
  createWorkOrderItem: createWorkOrderItemMock,
  updateWorkOrderItem: updateWorkOrderItemMock,
  deleteWorkOrderItem: deleteWorkOrderItemMock,
  createWorkOrderServiceItem: createWorkOrderServiceItemMock,
  updateWorkOrderServiceItem: updateWorkOrderServiceItemMock,
  deleteWorkOrderServiceItem: deleteWorkOrderServiceItemMock,
  createWorkOrderSalesRep: createWorkOrderSalesRepMock,
  updateWorkOrderSalesRep: updateWorkOrderSalesRepMock,
  deleteWorkOrderSalesRep: deleteWorkOrderSalesRepMock,
}))

describe("work-order child routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeWorkOrdersRouteMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: { id: "user-1", email: "owner@test.com" },
    })
    enforceRouteRateLimitMock.mockResolvedValue(null)
  })

  it("child item routes list, create, patch, and delete material items", async () => {
    listWorkOrderItemsMock.mockResolvedValue([{
      id: "item-1",
      productId: "prod-1",
      productName: "Pad",
      sendUnit: "SF",
      quantity: "2",
      unitPrice: "4.00",
      notes: "",
      allocations: [],
      allocatedQuantity: 0,
      remainingQuantity: 2,
      materialExpense: 0,
      hasAllocationShortage: true,
      changeOrderStatus: "SUFFICIENT",
      createdAt: "2026-03-19T00:00:00.000Z",
    }])
    createWorkOrderItemMock.mockResolvedValue({ id: "item-2", productId: "prod-1", allocations: [] })
    updateWorkOrderItemMock.mockResolvedValue({ id: "item-1", quantity: "3", productId: "prod-1", allocations: [] })

    const listResponse = await GET_ITEMS(new Request("http://localhost/api/flooring/work-orders/wo-1/items"), {
      params: Promise.resolve({ id: "wo-1" }),
    })
    expect((await listResponse.json()).items).toHaveLength(1)

    const createResponse = await POST_ITEM(
      new Request("http://localhost/api/flooring/work-orders/wo-1/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "prod-1", quantity: "2", unitPrice: "4.00" }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    expect(createResponse.status).toBe(201)
    expect(createWorkOrderItemMock).toHaveBeenCalledWith("wo-1", expect.objectContaining({ productId: "prod-1" }))

    const patchResponse = await PATCH_ITEM(
      new Request("http://localhost/api/flooring/work-orders/wo-1/items/item-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: "3" }),
      }),
      { params: Promise.resolve({ id: "wo-1", itemId: "item-1" }) },
    )
    expect((await patchResponse.json()).item).toEqual(expect.objectContaining({ id: "item-1", quantity: "3" }))

    const deleteResponse = await DELETE_ITEM(new Request("http://localhost/api/flooring/work-orders/wo-1/items/item-1"), {
      params: Promise.resolve({ id: "wo-1", itemId: "item-1" }),
    })
    expect((await deleteResponse.json()).ok).toBe(true)
    expect(deleteWorkOrderItemMock).toHaveBeenCalledWith("item-1")
  })

  it("child service-item routes list, create, patch, and delete service items", async () => {
    listWorkOrderServiceItemsMock.mockResolvedValue([{ id: "svc-item-1", serviceId: "svc-1", name: "Install", unitId: "unit-1", unitName: "SF", quantity: "1", unitPrice: "9.00", notes: "", createdAt: "2026-03-19T00:00:00.000Z" }])
    createWorkOrderServiceItemMock.mockResolvedValue({ id: "svc-item-2", serviceId: "svc-1", unitId: "unit-1" })
    updateWorkOrderServiceItemMock.mockResolvedValue({ id: "svc-item-1", quantity: "2", serviceId: "svc-1", unitId: "unit-1" })

    const listResponse = await GET_SERVICE_ITEMS(new Request("http://localhost/api/flooring/work-orders/wo-1/service-items"), {
      params: Promise.resolve({ id: "wo-1" }),
    })
    expect((await listResponse.json()).items).toHaveLength(1)

    const createResponse = await POST_SERVICE_ITEM(
      new Request("http://localhost/api/flooring/work-orders/wo-1/service-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: "svc-1", unitId: "unit-1", quantity: "1", unitPrice: "9.00" }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    expect(createResponse.status).toBe(201)
    expect(createWorkOrderServiceItemMock).toHaveBeenCalledWith("wo-1", expect.objectContaining({ serviceId: "svc-1" }))

    const patchResponse = await PATCH_SERVICE_ITEM(
      new Request("http://localhost/api/flooring/work-orders/wo-1/service-items/svc-item-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: "2" }),
      }),
      { params: Promise.resolve({ id: "wo-1", itemId: "svc-item-1" }) },
    )
    expect((await patchResponse.json()).item).toEqual(expect.objectContaining({ id: "svc-item-1", quantity: "2" }))

    const deleteResponse = await DELETE_SERVICE_ITEM(new Request("http://localhost/api/flooring/work-orders/wo-1/service-items/svc-item-1"), {
      params: Promise.resolve({ id: "wo-1", itemId: "svc-item-1" }),
    })
    expect((await deleteResponse.json()).ok).toBe(true)
    expect(deleteWorkOrderServiceItemMock).toHaveBeenCalledWith("svc-item-1")
  })

  it("material item routes return field metadata for invalid quantities", async () => {
    const response = await POST_ITEM(
      new Request("http://localhost/api/flooring/work-orders/wo-1/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "prod-1", quantity: "0" }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("quantity must be greater than 0")
    expect(payload.field).toBe("quantity")
  })

  it("material item routes reject unit prices with more than two decimals", async () => {
    const response = await POST_ITEM(
      new Request("http://localhost/api/flooring/work-orders/wo-1/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "prod-1", quantity: "1", unitPrice: "4.999" }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("unitPrice can have at most 2 decimal places")
    expect(payload.field).toBe("unitPrice")
  })

  it("service item routes require a custom name when no saved service is selected", async () => {
    const response = await POST_SERVICE_ITEM(
      new Request("http://localhost/api/flooring/work-orders/wo-1/service-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: "unit-1", quantity: "1" }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required when no saved service is selected")
    expect(payload.field).toBe("name")
  })

  it("service item routes reject quantities with more than two decimals", async () => {
    const response = await POST_SERVICE_ITEM(
      new Request("http://localhost/api/flooring/work-orders/wo-1/service-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: "svc-1", unitId: "unit-1", quantity: "1.999", unitPrice: "9.00" }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("quantity can have at most 2 decimal places")
    expect(payload.field).toBe("quantity")
  })

  it("child sales-rep routes list, create, patch, and delete rep rows", async () => {
    listWorkOrderSalesRepsMock.mockResolvedValue([
      { id: "rep-1", contactId: "contact-1", contactName: "Jane Rep", percent: "10" },
    ])
    createWorkOrderSalesRepMock.mockResolvedValue({ id: "rep-2", contactId: "contact-1", contactName: "Jane Rep", percent: "12.5" })
    updateWorkOrderSalesRepMock.mockResolvedValue({ id: "rep-1", contactId: "contact-1", contactName: "Jane Rep", percent: "15" })

    const listResponse = await GET_SALES_REPS(new Request("http://localhost/api/flooring/work-orders/wo-1/sales-reps"), {
      params: Promise.resolve({ id: "wo-1" }),
    })
    expect((await listResponse.json()).items).toHaveLength(1)

    const createResponse = await POST_SALES_REP(
      new Request("http://localhost/api/flooring/work-orders/wo-1/sales-reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: "contact-1", percent: "12.5" }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    expect(createResponse.status).toBe(201)
    expect(createWorkOrderSalesRepMock).toHaveBeenCalledWith("wo-1", expect.objectContaining({ contactId: "contact-1" }))

    const patchResponse = await PATCH_SALES_REP(
      new Request("http://localhost/api/flooring/work-orders/wo-1/sales-reps/rep-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percent: "15" }),
      }),
      { params: Promise.resolve({ id: "wo-1", repId: "rep-1" }) },
    )
    expect((await patchResponse.json()).item).toEqual(expect.objectContaining({ id: "rep-1", percent: "15" }))

    const deleteResponse = await DELETE_SALES_REP(new Request("http://localhost/api/flooring/work-orders/wo-1/sales-reps/rep-1"), {
      params: Promise.resolve({ id: "wo-1", repId: "rep-1" }),
    })
    expect((await deleteResponse.json()).ok).toBe(true)
    expect(deleteWorkOrderSalesRepMock).toHaveBeenCalledWith("rep-1")
  })

  it("sales-rep routes return field metadata for invalid percent and duplicate-contact errors", async () => {
    const invalidPercentResponse = await POST_SALES_REP(
      new Request("http://localhost/api/flooring/work-orders/wo-1/sales-reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: "contact-1", percent: "120" }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    const invalidPercentPayload = await invalidPercentResponse.json()

    expect(invalidPercentResponse.status).toBe(400)
    expect(invalidPercentPayload.error).toBe("percent must be between 0 and 100")
    expect(invalidPercentPayload.field).toBe("percent")

    createWorkOrderSalesRepMock.mockRejectedValueOnce({
      kind: "app",
      status: 409,
      field: "contactId",
      message: "This sales rep is already assigned to the work order",
    })

    const duplicateResponse = await POST_SALES_REP(
      new Request("http://localhost/api/flooring/work-orders/wo-1/sales-reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: "contact-1", percent: "10" }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    const duplicatePayload = await duplicateResponse.json()

    expect(duplicateResponse.status).toBe(409)
    expect(duplicatePayload.error).toBe("This sales rep is already assigned to the work order")
    expect(duplicatePayload.field).toBe("contactId")
  })

  it("child calculation route lists derived rows", async () => {
    listWorkOrderCalculationRowsMock.mockResolvedValue([
      { key: "expenses", label: "Expenses", value: 88.5, format: "currency" },
      { key: "profit", label: "Profit", value: 11.5, format: "currency" },
    ])

    const response = await GET_CALCULATIONS(new Request("http://localhost/api/flooring/work-orders/wo-1/calculations"), {
      params: Promise.resolve({ id: "wo-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.items).toEqual([
      { key: "expenses", label: "Expenses", value: 88.5, format: "currency" },
      { key: "profit", label: "Profit", value: 11.5, format: "currency" },
    ])
    expect(listWorkOrderCalculationRowsMock).toHaveBeenCalledWith("wo-1")
  })
})
