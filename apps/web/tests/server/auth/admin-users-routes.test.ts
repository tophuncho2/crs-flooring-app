import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  applyRoutePolicyMock,
  userFindManyMock,
  userFindUniqueMock,
  userUpdateMock,
  userDeleteMock,
} = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  userFindManyMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userUpdateMock: vi.fn(),
  userDeleteMock: vi.fn(),
}))

vi.mock("@/server/http/route-policy", () => ({
  applyRoutePolicy: applyRoutePolicyMock,
}))

vi.mock("@/server/platform/logger", () => ({
  logEvent: vi.fn(),
}))

vi.mock("@builders/db", async () => {
  const actual = await vi.importActual<typeof import("@builders/db")>("@builders/db")
  return {
    ...actual,
    prisma: {
      user: {
        findMany: userFindManyMock,
        findUnique: userFindUniqueMock,
        update: userUpdateMock,
        delete: userDeleteMock,
      },
    },
    db: {
      user: {
        findMany: userFindManyMock,
        findUnique: userFindUniqueMock,
        update: userUpdateMock,
        delete: userDeleteMock,
      },
    },
  }
})

const { GET: GET_USERS } = await import("@/app/api/admin/users/route")
const { DELETE: DELETE_USER, PATCH: PATCH_USER } = await import("@/app/api/admin/users/[id]/route")

describe("admin user routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    applyRoutePolicyMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      id: "admin-1",
      user: {
        id: "admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        isVerified: true,
      },
    })
  })

  it("GET returns system users while only builders remain manageable from the panel", async () => {
    userFindManyMock.mockResolvedValue([
      {
        id: "owner-1",
        email: "owner@test.com",
        role: "OWNER",
        isVerified: true,
        createdAt: new Date("2026-03-21T00:00:00Z"),
      },
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

    const response = await GET_USERS(new Request("http://localhost/api/admin/users"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.viewerCanManageUsers).toBe(true)
    expect(payload.users).toEqual([
      expect.objectContaining({
        id: "owner-1",
        role: "OWNER",
        canRestrict: false,
        canDelete: false,
      }),
      expect.objectContaining({
        id: "admin-1",
        role: "ADMIN",
        canRestrict: false,
        canDelete: false,
      }),
      expect.objectContaining({
        id: "builder-1",
        role: "BUILDER",
        canRestrict: true,
        canEditRole: false,
        canDelete: true,
      }),
    ])
    expect(userFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          role: {
            in: ["OWNER", "ADMIN", "BUILDER"],
          },
        },
      }),
    )
  })

  it("PATCH blocks governing admin accounts from the admin panel", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      isVerified: true,
      createdAt: new Date("2026-03-21T00:00:00Z"),
    })

    const response = await PATCH_USER(
      new Request("http://localhost/api/admin/users/admin-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: false }),
      }),
      { params: Promise.resolve({ id: "admin-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Only builder accounts can be governed from this panel")
    expect(userUpdateMock).not.toHaveBeenCalled()
  })

  it("PATCH updates builder verification", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "builder-1",
      email: "builder@test.com",
      role: "BUILDER",
      isVerified: false,
      createdAt: new Date("2026-03-21T00:00:00Z"),
    })
    userUpdateMock.mockResolvedValue({
      id: "builder-1",
      email: "builder@test.com",
      role: "BUILDER",
      isVerified: true,
      createdAt: new Date("2026-03-21T00:00:00Z"),
    })

    const response = await PATCH_USER(
      new Request("http://localhost/api/admin/users/builder-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: true }),
      }),
      { params: Promise.resolve({ id: "builder-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.user).toEqual(
      expect.objectContaining({
        id: "builder-1",
        role: "BUILDER",
        isVerified: true,
        canEditRole: false,
      }),
    )
    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "builder-1" },
        data: { isVerified: true },
      }),
    )
  })

  it("PATCH rejects role changes even for builder targets", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "builder-1",
      email: "builder@test.com",
      role: "BUILDER",
      isVerified: false,
      createdAt: new Date("2026-03-21T00:00:00Z"),
    })

    const response = await PATCH_USER(
      new Request("http://localhost/api/admin/users/builder-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      }),
      { params: Promise.resolve({ id: "builder-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("Builder roles cannot be edited from this panel")
    expect(userUpdateMock).not.toHaveBeenCalled()
  })

  it("DELETE blocks deleting admin accounts from the admin panel", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      isVerified: true,
      createdAt: new Date("2026-03-21T00:00:00Z"),
    })

    const response = await DELETE_USER(
      new Request("http://localhost/api/admin/users/admin-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "admin-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Only builder accounts can be governed from this panel")
    expect(userDeleteMock).not.toHaveBeenCalled()
  })

  it("returns shared auth responses unchanged", async () => {
    applyRoutePolicyMock.mockResolvedValueOnce(Response.json({ error: "Unauthorized" }, { status: 401 }))

    const response = await GET_USERS(new Request("http://localhost/api/admin/users"))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error).toBe("Unauthorized")
  })
})
