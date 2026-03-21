import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  ensureBuilderPanelAccessMock,
  getSessionUserMock,
  consumeRateLimitMock,
  userFindManyMock,
  userFindUniqueMock,
  userCountMock,
  userUpdateMock,
  userDeleteMock,
} = vi.hoisted(() => ({
  ensureBuilderPanelAccessMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
  userFindManyMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userCountMock: vi.fn(),
  userUpdateMock: vi.fn(),
  userDeleteMock: vi.fn(),
}))

vi.mock("@/server/auth/route-auth", () => ({
  ensureBuilderPanelAccess: ensureBuilderPanelAccessMock,
}))

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}))

vi.mock("@/server/platform/logger", () => ({
  logEvent: vi.fn(),
}))

vi.mock("@/server/platform/rate-limit", () => ({
  consumeRateLimit: consumeRateLimitMock,
  buildRateLimitResponse: vi.fn(() => new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: {
      findMany: userFindManyMock,
      findUnique: userFindUniqueMock,
      count: userCountMock,
      update: userUpdateMock,
      delete: userDeleteMock,
    },
  },
}))

const { GET: GET_USERS } = await import("@/app/api/builder/users/route")
const { DELETE: DELETE_USER, PATCH: PATCH_USER } = await import("@/app/api/builder/users/[id]/route")

describe("builder user routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureBuilderPanelAccessMock.mockResolvedValue(null)
    getSessionUserMock.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      isVerified: true,
    })
    consumeRateLimitMock.mockResolvedValue({
      allowed: true,
      count: 1,
      limit: 10,
      retryAfterSeconds: 60,
      requestId: "req-1",
      clientIp: "127.0.0.1",
    })
  })

  it("GET returns normalized user capabilities with last-admin protections", async () => {
    userCountMock.mockResolvedValue(1)
    userFindManyMock.mockResolvedValue([
      {
        id: "admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        isVerified: true,
        createdAt: new Date("2026-03-21T00:00:00Z"),
      },
      {
        id: "builder-1",
        email: "builder@test.com",
        role: "BUILDER",
        isVerified: false,
        createdAt: new Date("2026-03-21T00:00:00Z"),
      },
    ])

    const response = await GET_USERS()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.viewerCanManageUsers).toBe(true)
    expect(payload.users).toEqual([
      expect.objectContaining({
        id: "admin-1",
        canRestrict: false,
        canEditRole: false,
        canDelete: false,
      }),
      expect.objectContaining({
        id: "builder-1",
        canRestrict: true,
        canEditRole: true,
        canDelete: true,
      }),
    ])
  })

  it("PATCH blocks removing your own admin access", async () => {
    userCountMock.mockResolvedValue(1)
    userFindUniqueMock.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      isVerified: true,
      createdAt: new Date("2026-03-21T00:00:00Z"),
    })

    const response = await PATCH_USER(
      new Request("http://localhost/api/builder/users/admin-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "BUILDER" }),
      }),
      { params: Promise.resolve({ id: "admin-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("You cannot remove your own admin access")
    expect(userUpdateMock).not.toHaveBeenCalled()
  })

  it("DELETE blocks removing the last admin", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "admin-2",
      email: "other-admin@test.com",
      role: "ADMIN",
      isVerified: true,
    })
    userCountMock.mockResolvedValue(1)
    userFindUniqueMock.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      isVerified: true,
      createdAt: new Date("2026-03-21T00:00:00Z"),
    })

    const response = await DELETE_USER(
      new Request("http://localhost/api/builder/users/admin-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "admin-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("At least one admin must remain")
    expect(userDeleteMock).not.toHaveBeenCalled()
  })
})
