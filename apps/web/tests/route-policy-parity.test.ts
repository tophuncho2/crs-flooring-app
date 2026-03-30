import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  authorizeCategoriesRouteMock,
  authorizeWarehouseRouteMock,
  createCategoryMock,
  createWarehouseRowMock,
  deleteManufacturerMock,
  enforceRouteRateLimitMock,
  requireRouteAccessMock,
} = vi.hoisted(() => ({
  authorizeCategoriesRouteMock: vi.fn(),
  authorizeWarehouseRouteMock: vi.fn(),
  createCategoryMock: vi.fn(),
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

vi.mock("@/features/flooring/shared/access/lookup-domains", () => ({
  authorizeCategoriesRoute: authorizeCategoriesRouteMock,
  MANUFACTURERS_TOOL_SLUG: "manufacturers",
}))

vi.mock("@/features/flooring/shared/access/domain-tools", () => ({
  authorizeWarehouseRoute: authorizeWarehouseRouteMock,
}))

vi.mock("@/features/flooring/categories/data/queries", () => ({
  listCategories: vi.fn(),
}))

vi.mock("@/features/flooring/categories/application/manage-category", () => ({
  createCategoryRecord: createCategoryMock,
  replaceCategoryPrimarySection: vi.fn(),
  deleteCategoryRecord: vi.fn(),
  validateUpdateCategoryPrimarySectionInput: vi.fn((value) => value),
}))

vi.mock("@/features/flooring/warehouse/api", () => ({
  listWarehouseRows: vi.fn(),
  createWarehouseRow: createWarehouseRowMock,
  updateWarehouseRow: vi.fn(),
}))

vi.mock("@/features/flooring/manufacturers/application/manage-manufacturer", () => ({
  createManufacturerRecord: vi.fn(),
  replaceManufacturerPrimarySection: vi.fn(),
  deleteManufacturerRecord: deleteManufacturerMock,
  validateUpdateManufacturerPrimarySectionInput: vi.fn((value) => value),
}))

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

const { POST: POST_CATEGORY } = await import("@/app/api/flooring/categories/route")
const { POST: POST_WAREHOUSE } = await import("@/app/api/flooring/warehouses/route")
const { DELETE: DELETE_MANUFACTURER } = await import("@/app/api/flooring/manufacturers/[id]/route")

describe("route policy parity", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeCategoriesRouteMock.mockResolvedValue(routeAccess)
    authorizeWarehouseRouteMock.mockResolvedValue(routeAccess)
    requireRouteAccessMock.mockResolvedValue(routeAccess)
    enforceRouteRateLimitMock.mockResolvedValue(null)
  })

  it("categories write routes stop before mutation when rate limited", async () => {
    const rateLimitResponse = new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    enforceRouteRateLimitMock.mockResolvedValueOnce(rateLimitResponse)

    const response = await POST_CATEGORY(
      new Request("http://localhost/api/flooring/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Carpet" }),
      }),
    )

    expect(response).toBe(rateLimitResponse)
    expect(createCategoryMock).not.toHaveBeenCalled()
  })

  it("warehouse write routes stop before mutation when rate limited", async () => {
    const rateLimitResponse = new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    enforceRouteRateLimitMock.mockResolvedValueOnce(rateLimitResponse)

    const response = await POST_WAREHOUSE(
      new Request("http://localhost/api/flooring/warehouses", {
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
      new Request("http://localhost/api/flooring/manufacturers/mfg-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "mfg-1" }) },
    )

    expect(response).toBe(rateLimitResponse)
    expect(deleteManufacturerMock).not.toHaveBeenCalled()
  })
})
