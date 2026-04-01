import { beforeEach, describe, expect, it, vi } from "vitest"

const { getSessionUserMock, isToolUnlockedMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  isToolUnlockedMock: vi.fn(),
}))

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}))

vi.mock("@/server/platform/tool-subscriptions", () => ({
  isToolUnlocked: isToolUnlockedMock,
}))

const { authorizeRouteAccess } = await import("@/server/auth/route-auth")

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

  it("enforces capability and tool access for verified users", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "builder-1",
      email: "builder@test.com",
      role: "BUILDER",
      isVerified: true,
    })
    isToolUnlockedMock.mockResolvedValue(false)

    const response = await authorizeRouteAccess(new Request("http://localhost/test"), {
      capability: "system.access",
      toolSlug: "warehouse",
    })

    expect(response).toBeInstanceOf(Response)
    if (response instanceof Response) {
      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toEqual({ error: "Forbidden" })
    }
  })

  it("returns the authorized user context when access is allowed", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      isVerified: true,
    })
    isToolUnlockedMock.mockResolvedValue(true)

    const result = await authorizeRouteAccess(new Request("http://localhost/test"), {
      capability: "users.manage",
      toolSlug: "products",
    })

    expect(result).not.toBeInstanceOf(Response)
    if (!(result instanceof Response)) {
      expect(result.user.email).toBe("admin@test.com")
      expect(result.requestId).toBeTruthy()
      expect(result.clientIp).toBe("unknown")
    }
  })
})
