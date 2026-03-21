import { beforeEach, describe, expect, it, vi } from "vitest"
import { DELETE, PATCH } from "@/app/api/flooring/inventory/[id]/route"

const routeAccess = {
  requestId: "req-1",
  clientIp: "127.0.0.1",
  user: {
    id: "builder-1",
    email: "builder@test.com",
    role: "BUILDER",
    isVerified: true,
  },
} as const

const { prismaMock, requireRouteAccessMock, enforceRouteRateLimitMock, validateInventoryLocationSelectionMock } = vi.hoisted(() => ({
  prismaMock: {
    flooringInventory: {
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
  requireRouteAccessMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  validateInventoryLocationSelectionMock: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: prismaMock,
}))

vi.mock("@/server/http/route-helpers", () => ({
  requireRouteAccess: requireRouteAccessMock,
  enforceRouteRateLimit: enforceRouteRateLimitMock,
  routeJson: vi.fn((_context, body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 })),
  routeError: vi.fn((_context, error) =>
    new Response(
      JSON.stringify({
        error:
          error && typeof error === "object" && "message" in error ? String(error.message) : "Unexpected server error",
      }),
      {
        status:
          error && typeof error === "object" && "status" in error && typeof error.status === "number"
            ? error.status
            : 400,
      },
    ),
  ),
  logRouteMutationSuccess: vi.fn(),
  logRouteMutationFailure: vi.fn(),
}))

vi.mock("@/server/flooring/location-integrity", () => ({
  validateInventoryLocationSelection: validateInventoryLocationSelectionMock,
}))

describe("inventory routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRouteAccessMock.mockResolvedValue(routeAccess)
    enforceRouteRateLimitMock.mockResolvedValue(null)
    validateInventoryLocationSelectionMock.mockResolvedValue(undefined)
  })

  it("DELETE removes an inventory row and enforces warehouse auth", async () => {
    const response = await DELETE(new Request("http://localhost/api/flooring/inventory/inv-1"), {
      params: Promise.resolve({ id: "inv-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true })
    expect(prismaMock.flooringInventory.delete).toHaveBeenCalledWith({ where: { id: "inv-1" } })
    expect(requireRouteAccessMock).toHaveBeenCalledWith(expect.any(Request), {
      capability: "system.access",
      toolSlug: "warehouse",
    })
  })

  it("PATCH accepts an empty dye lot and persists it as null", async () => {
    prismaMock.flooringInventory.update.mockResolvedValue({
      id: "inv-1",
      importEntryId: "imp-1",
      itemNumber: "1001",
      dyeLot: null,
      stockCount: { toString: () => "12.00" },
      cost: { toString: () => "10.00" },
      freight: { toString: () => "5.00" },
      notes: null,
      createdAt: new Date("2026-03-19T00:00:00.000Z"),
      updatedAt: new Date("2026-03-19T00:00:00.000Z"),
      productId: "prod-1",
      product: {
        id: "prod-1",
        name: "Oak Plank",
        manufacturerName: null,
        style: null,
        color: null,
        category: { stockUnit: { name: "SF" } },
      },
      locationId: "loc-1",
      location: {
        id: "loc-1",
        locationCode: "A1",
        section: { name: "Showroom" },
        warehouse: { id: "wh-1", name: "Main Warehouse" },
      },
      importEntry: {
        id: "imp-1",
        importNumber: 1,
        tag: "Spring Load",
        status: "PENDING",
        transportType: "PURCHASE_ORDER",
        warehouse: { id: "wh-1", name: "Main Warehouse" },
      },
    })

    const response = await PATCH(
      new Request("http://localhost/api/flooring/inventory/inv-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importEntryId: "imp-1",
          productId: "prod-1",
          locationId: "loc-1",
          itemNumber: "1001",
          dyeLot: "",
          stockCount: "12.00",
          cost: "10.00",
          freight: "5.00",
          notes: "",
        }),
      }),
      { params: Promise.resolve({ id: "inv-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(prismaMock.flooringInventory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dyeLot: null,
        }),
      }),
    )
    expect(payload.inventory.dyeLot).toBe("")
  })
})
