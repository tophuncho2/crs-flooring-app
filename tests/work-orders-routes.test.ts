import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET as GET_ITEMS, POST as POST_ITEM } from "@/app/api/flooring/work-orders/[id]/items/route"
import { DELETE as DELETE_ITEM, PATCH as PATCH_ITEM } from "@/app/api/flooring/work-orders/[id]/items/[itemId]/route"
import { GET as GET_SERVICE_ITEMS, POST as POST_SERVICE_ITEM } from "@/app/api/flooring/work-orders/[id]/service-items/route"
import { DELETE as DELETE_SERVICE_ITEM, PATCH as PATCH_SERVICE_ITEM } from "@/app/api/flooring/work-orders/[id]/service-items/[itemId]/route"

const {
  requireRouteAccessMock,
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
} = vi.hoisted(() => ({
  requireRouteAccessMock: vi.fn(),
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
}))

vi.mock("@/server/http/route-helpers", () => ({
  requireRouteAccess: requireRouteAccessMock,
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
}))

vi.mock("@/features/flooring/work-orders/mutations", () => ({
  createWorkOrderItem: createWorkOrderItemMock,
  updateWorkOrderItem: updateWorkOrderItemMock,
  deleteWorkOrderItem: deleteWorkOrderItemMock,
  createWorkOrderServiceItem: createWorkOrderServiceItemMock,
  updateWorkOrderServiceItem: updateWorkOrderServiceItemMock,
  deleteWorkOrderServiceItem: deleteWorkOrderServiceItemMock,
}))

describe("work-order child routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRouteAccessMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: { id: "user-1", email: "owner@test.com" },
    })
    enforceRouteRateLimitMock.mockResolvedValue(null)
  })

  it("child item routes list, create, patch, and delete material items", async () => {
    listWorkOrderItemsMock.mockResolvedValue([{ id: "item-1", productId: "prod-1", productName: "Pad", sendUnit: "SF", quantity: "2", unitPrice: "4.00", notes: "", linkedInventoryId: "", linkedInventoryLabel: "", changeOrderStatus: "SUFFICIENT", createdAt: "2026-03-19T00:00:00.000Z" }])
    createWorkOrderItemMock.mockResolvedValue({ id: "item-2", productId: "prod-1", linkedInventoryId: null })
    updateWorkOrderItemMock.mockResolvedValue({ id: "item-1", quantity: "3", productId: "prod-1", linkedInventoryId: null })

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
})
