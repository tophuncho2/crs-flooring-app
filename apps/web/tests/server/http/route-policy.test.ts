import { beforeEach, describe, expect, it, vi } from "vitest"

// Pins the ONE sanctioned behavior delta of the minRank fold: rank is enforced
// AFTER auth and BEFORE rate-limit. An under-ranked caller now gets a 403
// without consuming a rate-limit token (previously the rank check ran after
// rate-limit, so a wrong-rank caller could 429 before the correct 403).

const { getSessionUserMock, consumeRateLimitMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
}))

vi.mock("@/server/auth/session", () => ({ getSessionUser: getSessionUserMock }))

vi.mock("@/server/platform/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/server/platform/rate-limit")>(
    "@/server/platform/rate-limit",
  )
  return { ...actual, consumeRateLimit: consumeRateLimitMock }
})

const { applyRoutePolicy } = await import("@/server/http/route-policy")

const POLICY = {
  minRank: "TIER_1" as const,
  rateLimit: { limit: 100, windowMs: 600000, scope: "test.create", route: "/api/test" },
}

beforeEach(() => {
  vi.clearAllMocks()
  consumeRateLimitMock.mockResolvedValue({ allowed: true })
})

describe("applyRoutePolicy — minRank fold", () => {
  it("returns 403 for an under-ranked caller WITHOUT consuming a rate-limit token", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1", email: "u1@test.com", rank: "TIER_3" })

    const result = await applyRoutePolicy(new Request("http://localhost/api/test"), POLICY)

    expect(result).toBeInstanceOf(Response)
    if (result instanceof Response) {
      expect(result.status).toBe(403)
      await expect(result.json()).resolves.toEqual({ error: "Forbidden" })
    }
    // Rank fires before rate-limit — no token drained.
    expect(consumeRateLimitMock).not.toHaveBeenCalled()
  })

  it("consumes the rate-limit token only after the rank check passes", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1", email: "u1@test.com", rank: "DEVELOPER" })

    const result = await applyRoutePolicy(new Request("http://localhost/api/test"), POLICY)

    expect(result).not.toBeInstanceOf(Response)
    expect(consumeRateLimitMock).toHaveBeenCalledTimes(1)
  })

  it("skips the rank check entirely when no minRank is set", async () => {
    getSessionUserMock.mockResolvedValue({ id: "u1", email: "u1@test.com", rank: "TIER_3" })

    const result = await applyRoutePolicy(new Request("http://localhost/api/test"))

    expect(result).not.toBeInstanceOf(Response)
    expect(consumeRateLimitMock).not.toHaveBeenCalled()
  })
})
