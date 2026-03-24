import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  applyRoutePolicyMock,
  userUpdateMock,
  userTablePreferenceFindUniqueMock,
  userTablePreferenceUpsertMock,
} = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  userUpdateMock: vi.fn(),
  userTablePreferenceFindUniqueMock: vi.fn(),
  userTablePreferenceUpsertMock: vi.fn(),
}))

vi.mock("@/server/http/route-policy", () => ({
  applyRoutePolicy: applyRoutePolicyMock,
}))

vi.mock("@/server/platform/logger", () => ({
  logEvent: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: {
      update: userUpdateMock,
    },
    userTablePreference: {
      findUnique: userTablePreferenceFindUniqueMock,
      upsert: userTablePreferenceUpsertMock,
    },
  },
}))

const { PATCH: PATCH_FLOORING_NAV } = await import("@/app/api/account/flooring-nav/route")
const { GET: GET_TABLE_PREFERENCE, PATCH: PATCH_TABLE_PREFERENCE } = await import(
  "@/app/api/account/table-preferences/[tableKey]/route"
)

describe("account routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    applyRoutePolicyMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: {
        id: "user-1",
        email: "owner@test.com",
        role: "OWNER",
        isVerified: true,
      },
    })
  })

  it("GET /api/account/table-preferences/[tableKey] returns the saved preference", async () => {
    userTablePreferenceFindUniqueMock.mockResolvedValue({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["name", "cost"],
    })

    const response = await GET_TABLE_PREFERENCE(new Request("http://localhost/api/account/table-preferences/products-main"), {
      params: Promise.resolve({ tableKey: "products-main" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["name", "cost"],
    })
  })

  it("PATCH /api/account/table-preferences/[tableKey] filters unknown columns before persisting", async () => {
    userTablePreferenceUpsertMock.mockResolvedValue({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["name", "qty", "cost"],
    })

    const response = await PATCH_TABLE_PREFERENCE(
      new Request("http://localhost/api/account/table-preferences/products-main", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hiddenColumnKeys: ["cost", "cost", "bad"],
          columnOrderKeys: ["qty", "bad", "name"],
          allowedColumnKeys: ["name", "qty", "cost"],
        }),
      }),
      { params: Promise.resolve({ tableKey: "products-main" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(userTablePreferenceUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          hiddenColumnKeys: ["cost"],
          columnOrderKeys: ["qty", "name", "cost"],
        },
      }),
    )
    expect(payload).toEqual({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["name", "qty", "cost"],
    })
  })

  it("PATCH /api/account/flooring-nav filters unknown slugs and returns the normalized preference", async () => {
    userUpdateMock.mockResolvedValue({
      hiddenFlooringNavSlugs: ["flooring-cut-logs"],
      flooringNavOrderSlugs: ["products", "flooring-templates", "flooring-cut-logs"],
    })

    const response = await PATCH_FLOORING_NAV(
      new Request("http://localhost/api/account/flooring-nav", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visibleSlugs: ["products", "products", "bad"],
          orderedSlugs: ["flooring-templates", "bad", "products"],
        }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(userUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          flooringNavOrderSlugs: expect.arrayContaining(["flooring-templates", "products"]),
        }),
      }),
    )
    expect(payload).toEqual({
      visibleSlugs: expect.arrayContaining(["products", "flooring-templates"]),
      orderedSlugs: ["products", "flooring-templates", "flooring-cut-logs"],
    })
  })

  it("returns shared auth responses unchanged", async () => {
    applyRoutePolicyMock.mockResolvedValueOnce(Response.json({ error: "Unauthorized" }, { status: 401 }))

    const response = await PATCH_FLOORING_NAV(
      new Request("http://localhost/api/account/flooring-nav", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleSlugs: [], orderedSlugs: [] }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error).toBe("Unauthorized")
  })
})
