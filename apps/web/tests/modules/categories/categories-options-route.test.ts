import { beforeEach, describe, expect, it, vi } from "vitest"

// Golden-master for the canonical `/options` query shape: applyRoutePolicy ->
// enforceQueryRateLimit -> validate -> useCase -> routeJson, body passed through
// unchanged. Anchors the runQuery convergence for the options endpoints.

const { searchCategoryOptionsUseCaseMock, applyRoutePolicyMock, enforceQueryRateLimitMock } =
  vi.hoisted(() => ({
    searchCategoryOptionsUseCaseMock: vi.fn(),
    applyRoutePolicyMock: vi.fn(),
    enforceQueryRateLimitMock: vi.fn(),
  }))

vi.mock("@builders/application", async () => {
  const actual = await vi.importActual<typeof import("@builders/application")>("@builders/application")
  return { ...actual, searchCategoryOptionsUseCase: searchCategoryOptionsUseCaseMock }
})

vi.mock("@/server/http/route-policy", async () => {
  const actual = await vi.importActual<typeof import("@/server/http/route-policy")>("@/server/http/route-policy")
  return {
    ...actual,
    applyRoutePolicy: applyRoutePolicyMock,
    enforceQueryRateLimit: enforceQueryRateLimitMock,
  }
})

vi.mock("@/server/platform/logger", () => ({ logEvent: vi.fn() }))

const { GET } = await import("@/app/api/categories/options/route")

beforeEach(() => {
  vi.clearAllMocks()
  applyRoutePolicyMock.mockResolvedValue({
    requestId: "req-1",
    clientIp: "127.0.0.1",
    user: { id: "admin-1", email: "admin@test.com", rank: "DEVELOPER" },
  })
  enforceQueryRateLimitMock.mockResolvedValue(null)
})

describe("GET /api/categories/options", () => {
  it("passes the options use-case result through unchanged", async () => {
    searchCategoryOptionsUseCaseMock.mockResolvedValue({ options: [{ id: "c-1", label: "Tile" }] })

    const response = await GET(new Request("http://localhost/api/categories/options?search=ti&take=20"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ options: [{ id: "c-1", label: "Tile" }] })
    expect(searchCategoryOptionsUseCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({ search: "ti", take: 20 }),
    )
    expect(enforceQueryRateLimitMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "/api/categories/options",
    )
  })

  it("returns shared auth/rank responses from applyRoutePolicy unchanged", async () => {
    applyRoutePolicyMock.mockResolvedValueOnce(Response.json({ error: "Forbidden" }, { status: 403 }))

    const response = await GET(new Request("http://localhost/api/categories/options"))

    expect(response.status).toBe(403)
    expect(searchCategoryOptionsUseCaseMock).not.toHaveBeenCalled()
  })
})
