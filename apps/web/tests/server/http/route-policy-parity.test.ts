import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  authorizeWarehouseRouteMock,
  createWarehouseRowMock,
  deleteManufacturerMock,
  enforceRouteRateLimitMock,
  requireRouteAccessMock,
} = vi.hoisted(() => ({
  authorizeWarehouseRouteMock: vi.fn(),
  createWarehouseRowMock: vi.fn(),
  deleteManufacturerMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  requireRouteAccessMock: vi.fn(),
}))

const routeAccess = {
  requestId: "req-1",
  user: {
    id: "user-1",
    email: "builder@example.com",
    role: "BUILDER",
    isVerified: true,
    tools: [],
  },
  clientIp: "127.0.0.1",
} as const

vi.mock("@/modules/shared/access/lookup-domains", () => ({
  MANUFACTURERS_TOOL_SLUG: "manufacturers",
}))

vi.mock("@/modules/shared/access/domain-tools", () => ({
  authorizeWarehouseRoute: authorizeWarehouseRouteMock,
}))

vi.mock("@/modules/warehouse/data/api", () => ({
  listWarehouseRows: vi.fn(),
  createWarehouseRow: createWarehouseRowMock,
  updateWarehouseRow: vi.fn(),
}))

vi.mock("@builders/application", async () => {
  const actual = await vi.importActual<typeof import("@builders/application")>("@builders/application")
  return {
    ...actual,
    createManufacturerUseCase: vi.fn(),
    updateManufacturerUseCase: vi.fn(),
    deleteManufacturerUseCase: deleteManufacturerMock,
  }
})

vi.mock("@/server/http/route-helpers", () => ({
  requireRouteAccess: requireRouteAccessMock,
  enforceRouteRateLimit: enforceRouteRateLimitMock,
  routeJson: vi.fn((_context, body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 })),
  routeError: vi.fn((_context, error) =>
    new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected server error",
      }),
      { status: 500 },
    ),
  ),
  logRouteMutationSuccess: vi.fn(),
  logRouteMutationFailure: vi.fn(),
}))

const { POST: POST_WAREHOUSE } = await import("@/app/api/warehouses/route")
const { DELETE: DELETE_MANUFACTURER } = await import("@/app/api/manufacturers/[id]/route")

describe("route policy parity", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeWarehouseRouteMock.mockResolvedValue(routeAccess)
    requireRouteAccessMock.mockResolvedValue(routeAccess)
    enforceRouteRateLimitMock.mockResolvedValue(null)
  })

  it("warehouse write routes stop before mutation when rate limited", async () => {
    const rateLimitResponse = new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    enforceRouteRateLimitMock.mockResolvedValueOnce(rateLimitResponse)

    const response = await POST_WAREHOUSE(
      new Request("http://localhost/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Main Warehouse" }),
      }),
    )

    expect(response).toBe(rateLimitResponse)
    expect(createWarehouseRowMock).not.toHaveBeenCalled()
  })

  it("manufacturer delete routes stop before mutation when rate limited", async () => {
    const rateLimitResponse = new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    enforceRouteRateLimitMock.mockResolvedValueOnce(rateLimitResponse)

    const response = await DELETE_MANUFACTURER(
      new Request("http://localhost/api/manufacturers/mfg-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "mfg-1" }) },
    )

    expect(response).toBe(rateLimitResponse)
    expect(deleteManufacturerMock).not.toHaveBeenCalled()
  })
})
