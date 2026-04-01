import { beforeEach, describe, expect, it, vi } from "vitest"
import { DELETE, GET } from "@/app/api/imports/[id]/route"

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

const { prismaMock, requireRouteAccessMock, enforceRouteRateLimitMock } = vi.hoisted(() => ({
  prismaMock: {
    flooringImportEntry: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
  requireRouteAccessMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
}))

vi.mock("@builders/db", async () => {
  const actual = await vi.importActual<typeof import("@builders/db")>("@builders/db")
  return {
    ...actual,
    prisma: prismaMock,
    db: prismaMock,
  }
})

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

describe("imports routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRouteAccessMock.mockResolvedValue(routeAccess)
    enforceRouteRateLimitMock.mockResolvedValue(null)
  })

  it("DELETE returns 404 when the import is missing", async () => {
    prismaMock.flooringImportEntry.findUnique.mockResolvedValue(null)

    const response = await DELETE(new Request("http://localhost/api/imports/imp-1"), {
      params: Promise.resolve({ id: "imp-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.error).toBe("Import not found")
    expect(prismaMock.flooringImportEntry.delete).not.toHaveBeenCalled()
  })

  it("GET returns the normalized import detail payload", async () => {
    prismaMock.flooringImportEntry.findUniqueOrThrow.mockResolvedValue({
      id: "imp-1",
      importNumber: 1,
      orderNumber: "PO-1",
      tag: "Spring Load",
      transportType: "PURCHASE_ORDER",
      status: "PENDING",
      notes: "Dock notes",
      warehouseId: "wh-1",
      warehouse: { id: "wh-1", name: "Main Warehouse" },
      createdAt: new Date("2026-03-23T00:00:00.000Z"),
      updatedAt: new Date("2026-03-23T00:00:00.000Z"),
      _count: { inventories: 0 },
      inventories: [],
    })

    const response = await GET(new Request("http://localhost/api/imports/imp-1"), {
      params: Promise.resolve({ id: "imp-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.import).toEqual(
      expect.objectContaining({
        id: "imp-1",
        importNumber: 1,
        orderNumber: "PO-1",
        tag: "Spring Load",
        warehouseName: "Main Warehouse",
        itemsCount: 0,
      }),
    )
    expect(requireRouteAccessMock).toHaveBeenCalledWith(expect.any(Request), {
      capability: "system.access",
      toolSlug: "warehouse",
    })
  })

  it("DELETE returns 409 when the import still has inventory rows", async () => {
    prismaMock.flooringImportEntry.findUnique.mockResolvedValue({
      id: "imp-1",
      _count: { inventories: 2 },
    })

    const response = await DELETE(new Request("http://localhost/api/imports/imp-1"), {
      params: Promise.resolve({ id: "imp-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This import has inventory rows and cannot be deleted")
    expect(prismaMock.flooringImportEntry.delete).not.toHaveBeenCalled()
  })

  it("DELETE succeeds when there are no inventory rows", async () => {
    prismaMock.flooringImportEntry.findUnique.mockResolvedValue({
      id: "imp-1",
      _count: { inventories: 0 },
    })

    const response = await DELETE(new Request("http://localhost/api/imports/imp-1"), {
      params: Promise.resolve({ id: "imp-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true })
    expect(prismaMock.flooringImportEntry.delete).toHaveBeenCalledWith({ where: { id: "imp-1" } })
    expect(requireRouteAccessMock).toHaveBeenCalledWith(expect.any(Request), {
      capability: "system.access",
      toolSlug: "warehouse",
    })
  })
})
