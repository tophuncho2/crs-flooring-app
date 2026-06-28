import { beforeEach, describe, expect, it, vi } from "vitest"

const { getSessionUserMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
}))

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}))

const { authorizeRouteAccess, enforceManageUsersAccess } = await import("@/server/auth/route-auth")

function buildManageUsersAccess(rank: string) {
  return {
    user: { id: "u1", email: "u1@test.com", rank: rank as never, isVerified: true },
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

  it("returns a forbidden response when the user is not verified", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "builder-1",
      email: "builder@test.com",
      rank: "DEVELOPER",
      isVerified: false,
    })

    const response = await authorizeRouteAccess(new Request("http://localhost/test"))

    expect(response).toBeInstanceOf(Response)
    if (response instanceof Response) {
      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toEqual({ error: "Account not approved" })
    }
  })

  it("allows an unverified user through when allowUnverified is set", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "builder-2",
      email: "pending@test.com",
      rank: "DEVELOPER",
      isVerified: false,
    })

    const result = await authorizeRouteAccess(new Request("http://localhost/test"), {
      allowUnverified: true,
    })

    expect(result).not.toBeInstanceOf(Response)
    if (!(result instanceof Response)) {
      expect(result.user.email).toBe("pending@test.com")
    }
  })

  it("returns the authorized user context for a verified user", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      rank: "DEVELOPER",
      isVerified: true,
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
