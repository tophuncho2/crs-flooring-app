import { beforeEach, describe, expect, it, vi } from "vitest"

const { getSessionUserMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
}))

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}))

const { authorizeRouteAccess, enforceManageUsersAccess, enforceRankAtLeast } = await import(
  "@/server/auth/route-auth"
)

function buildManageUsersAccess(rank: string) {
  return {
    user: { id: "u1", email: "u1@test.com", rank: rank as never },
    requestId: "req-1",
    clientIp: "unknown",
  }
}

describe("authorizeRouteAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a request-id tagged unauthorized response when no user exists", async () => {
    getSessionUserMock.mockResolvedValue(null)

    const response = await authorizeRouteAccess(new Request("http://localhost/test"))

    expect(response).toBeInstanceOf(Response)
    if (response instanceof Response) {
      expect(response.status).toBe(401)
      expect(response.headers.get("x-request-id")).toBeTruthy()
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" })
    }
  })

  it("returns the authorized user context for an authenticated user", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      rank: "DEVELOPER",
    })

    const result = await authorizeRouteAccess(new Request("http://localhost/test"))

    expect(result).not.toBeInstanceOf(Response)
    if (!(result instanceof Response)) {
      expect(result.user.email).toBe("admin@test.com")
      expect(result.requestId).toBeTruthy()
      expect(result.clientIp).toBe("unknown")
    }
  })
})

describe("enforceRankAtLeast", () => {
  it("admits ranks at or above the given minimum", () => {
    expect(enforceRankAtLeast(buildManageUsersAccess("DEVELOPER"), "TIER_2")).toBeNull()
    expect(enforceRankAtLeast(buildManageUsersAccess("TIER_1"), "TIER_2")).toBeNull()
    expect(enforceRankAtLeast(buildManageUsersAccess("TIER_2"), "TIER_2")).toBeNull()
  })

  it("returns a request-id tagged 403 for ranks below the given minimum", async () => {
    const response = enforceRankAtLeast(buildManageUsersAccess("TIER_3"), "TIER_2")

    expect(response).toBeInstanceOf(Response)
    if (response instanceof Response) {
      expect(response.status).toBe(403)
      expect(response.headers.get("x-request-id")).toBe("req-1")
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" })
    }
  })
})

describe("enforceManageUsersAccess", () => {
  it("admits DEVELOPER and TIER_1", () => {
    expect(enforceManageUsersAccess(buildManageUsersAccess("DEVELOPER"))).toBeNull()
    expect(enforceManageUsersAccess(buildManageUsersAccess("TIER_1"))).toBeNull()
  })

  it("returns a request-id tagged 403 for ranks below the threshold", async () => {
    const response = enforceManageUsersAccess(buildManageUsersAccess("TIER_2"))

    expect(response).toBeInstanceOf(Response)
    if (response instanceof Response) {
      expect(response.status).toBe(403)
      expect(response.headers.get("x-request-id")).toBe("req-1")
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" })
    }
  })
})
