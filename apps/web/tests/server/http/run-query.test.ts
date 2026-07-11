import { beforeEach, describe, expect, it, vi } from "vitest"

// Unit tests for the createQueryRoute wrapper. The route-policy seams are mocked
// so we exercise the wrapper's own branches: auth/rank passthrough, rate-limit
// passthrough, param + query parsing, response shaping, and error normalization.

const { applyRoutePolicyMock, enforceQueryRateLimitMock } = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  enforceQueryRateLimitMock: vi.fn(),
}))

vi.mock("@/server/http/route-policy", async () => {
  const actual = await vi.importActual<typeof import("@/server/http/route-policy")>("@/server/http/route-policy")
  return { ...actual, applyRoutePolicy: applyRoutePolicyMock, enforceQueryRateLimit: enforceQueryRateLimitMock }
})

const { createQueryRoute } = await import("@/server/http/run-query")

const ACCESS = {
  requestId: "req-1",
  clientIp: "127.0.0.1",
  user: { id: "admin-1", email: "admin@test.com", rank: "DEVELOPER" as const },
}

beforeEach(() => {
  vi.clearAllMocks()
  applyRoutePolicyMock.mockResolvedValue(ACCESS)
  enforceQueryRateLimitMock.mockResolvedValue(null)
})

describe("createQueryRoute", () => {
  it("parses the query and returns the use-case result unchanged (default body)", async () => {
    const useCase = vi.fn().mockResolvedValue({ rows: [1, 2], total: 2 })
    const GET = createQueryRoute({
      route: "/api/things",
      parseInput: (sp) => ({ page: Number(sp.get("page") ?? "1") }),
      useCase,
    })

    const response = await GET(new Request("http://localhost/api/things?page=3"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ rows: [1, 2], total: 2 })
    expect(useCase).toHaveBeenCalledWith(expect.objectContaining({ input: { page: 3 } }))
    expect(enforceQueryRateLimitMock).toHaveBeenCalledWith(expect.anything(), ACCESS, "/api/things")
  })

  it("passes minRank into applyRoutePolicy and returns its Response unchanged", async () => {
    applyRoutePolicyMock.mockResolvedValueOnce(Response.json({ error: "Forbidden" }, { status: 403 }))
    const useCase = vi.fn()
    const GET = createQueryRoute({ route: "/api/things", minRank: "TIER_1", parseInput: () => ({}), useCase })

    const response = await GET(new Request("http://localhost/api/things"))

    expect(response.status).toBe(403)
    expect(applyRoutePolicyMock).toHaveBeenCalledWith(expect.anything(), { minRank: "TIER_1" })
    expect(useCase).not.toHaveBeenCalled()
  })

  it("returns the rate-limit Response unchanged", async () => {
    enforceQueryRateLimitMock.mockResolvedValueOnce(Response.json({ error: "rate" }, { status: 429 }))
    const useCase = vi.fn()
    const GET = createQueryRoute({ route: "/api/things", parseInput: () => ({}), useCase })

    const response = await GET(new Request("http://localhost/api/things"))

    expect(response.status).toBe(429)
    expect(useCase).not.toHaveBeenCalled()
  })

  it("threads parsed params through to parseInput/useCase and shapes the body", async () => {
    const useCase = vi.fn().mockResolvedValue({ id: "x-1" })
    const GET = createQueryRoute({
      route: "/api/things/[id]",
      parseParams: async (raw) => ({ id: (raw as { id: string }).id }),
      parseInput: () => ({}),
      useCase,
      buildResponseBody: ({ result }) => ({ thing: result }),
    })

    const response = await GET(new Request("http://localhost/api/things/x-1"), {
      params: Promise.resolve({ id: "x-1" }),
    })
    const payload = await response.json()

    expect(payload).toEqual({ thing: { id: "x-1" } })
    expect(useCase).toHaveBeenCalledWith(expect.objectContaining({ params: { id: "x-1" } }))
  })

  it("routes a thrown error through routeError (status preserved)", async () => {
    const useCase = vi.fn().mockRejectedValue(
      Object.assign(new Error("Not found"), { status: 404 }),
    )
    const GET = createQueryRoute({ route: "/api/things", parseInput: () => ({}), useCase })

    const response = await GET(new Request("http://localhost/api/things"))
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.error).toBe("Not found")
  })
})
