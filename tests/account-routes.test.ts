import { Prisma } from "@prisma/client"
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
      isAscendingSort: false,
      isGroupingEnabled: true,
      groupByKeys: ["warehouse"],
      filtersJson: { status: "pending" },
    })

    const response = await GET_TABLE_PREFERENCE(new Request("http://localhost/api/account/table-preferences/products-main"), {
      params: Promise.resolve({ tableKey: "products-main" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["name", "cost"],
      isAscendingSort: false,
      isGroupingEnabled: true,
      groupByKeys: ["warehouse"],
      filters: { status: "pending" },
    })
  })

  it("PATCH /api/account/table-preferences/[tableKey] filters unknown columns before persisting", async () => {
    userTablePreferenceFindUniqueMock.mockResolvedValue({
      hiddenColumnKeys: [],
      columnOrderKeys: [],
      isAscendingSort: true,
      isGroupingEnabled: false,
      groupByKeys: [],
      filtersJson: null,
    })
    userTablePreferenceUpsertMock.mockResolvedValue({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["name", "qty", "cost"],
      isAscendingSort: true,
      isGroupingEnabled: false,
      groupByKeys: [],
      filtersJson: null,
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
        update: expect.objectContaining({
          hiddenColumnKeys: ["cost"],
          columnOrderKeys: ["qty", "name", "cost"],
        }),
      }),
    )
    expect(payload).toEqual({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["name", "qty", "cost"],
      isAscendingSort: true,
      isGroupingEnabled: false,
      groupByKeys: [],
      filters: {},
    })
  })

  it("PATCH /api/account/table-preferences/[tableKey] merges valid sort, grouping, and filters into the existing preference", async () => {
    userTablePreferenceFindUniqueMock.mockResolvedValue({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["name", "cost"],
      isAscendingSort: true,
      isGroupingEnabled: false,
      groupByKeys: [],
      filtersJson: { status: "all", warehouseId: "all" },
    })
    userTablePreferenceUpsertMock.mockResolvedValue({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["name", "cost"],
      isAscendingSort: false,
      isGroupingEnabled: true,
      groupByKeys: ["warehouse"],
      filtersJson: { status: "pending", warehouseId: "wh-1" },
    })

    const response = await PATCH_TABLE_PREFERENCE(
      new Request("http://localhost/api/account/table-preferences/inventory-main", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isAscendingSort: false,
          isGroupingEnabled: true,
          groupByKeys: ["warehouse", "bad"],
          filters: {
            status: "pending",
            warehouseId: "wh-1",
            unknown: "bad",
          },
          allowedGroupKeys: ["warehouse", "status"],
          allowedFilterValues: {
            status: ["all", "pending", "final"],
            warehouseId: ["all", "wh-1"],
          },
        }),
      }),
      { params: Promise.resolve({ tableKey: "inventory-main" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(userTablePreferenceUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          hiddenColumnKeys: ["cost"],
          columnOrderKeys: ["name", "cost"],
          isAscendingSort: false,
          isGroupingEnabled: true,
          groupByKeys: ["warehouse"],
          filtersJson: { status: "pending", warehouseId: "wh-1" },
        }),
      }),
    )
    expect(payload).toEqual({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["name", "cost"],
      isAscendingSort: false,
      isGroupingEnabled: true,
      groupByKeys: ["warehouse"],
      filters: { status: "pending", warehouseId: "wh-1" },
    })
  })

  it("GET /api/account/table-preferences/[tableKey] falls back to legacy columns when view-state columns are not in the database yet", async () => {
    userTablePreferenceFindUniqueMock
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError(
          "The column `UserTablePreference.isAscendingSort` does not exist in the current database.",
          {
            code: "P2022",
            clientVersion: "6.12.0",
          },
        ),
      )
      .mockResolvedValueOnce({
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
      isAscendingSort: true,
      isGroupingEnabled: false,
      groupByKeys: [],
      filters: {},
    })
    expect(userTablePreferenceFindUniqueMock).toHaveBeenCalledTimes(2)
  })

  it("PATCH /api/account/table-preferences/[tableKey] falls back to legacy writes when view-state columns are not in the database yet", async () => {
    userTablePreferenceFindUniqueMock
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError(
          "The column `UserTablePreference.isAscendingSort` does not exist in the current database.",
          {
            code: "P2022",
            clientVersion: "6.12.0",
          },
        ),
      )
      .mockResolvedValueOnce({
        hiddenColumnKeys: [],
        columnOrderKeys: [],
      })
    userTablePreferenceUpsertMock
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError(
          "The column `UserTablePreference.isAscendingSort` does not exist in the current database.",
          {
            code: "P2022",
            clientVersion: "6.12.0",
          },
        ),
      )
      .mockResolvedValueOnce({
        hiddenColumnKeys: ["cost"],
        columnOrderKeys: ["qty", "name", "cost"],
      })

    const response = await PATCH_TABLE_PREFERENCE(
      new Request("http://localhost/api/account/table-preferences/products-main", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hiddenColumnKeys: ["cost", "bad"],
          columnOrderKeys: ["qty", "bad", "name"],
          isAscendingSort: false,
          filters: { status: "pending" },
          allowedColumnKeys: ["name", "qty", "cost"],
          allowedFilterValues: {
            status: ["all", "pending"],
          },
        }),
      }),
      { params: Promise.resolve({ tableKey: "products-main" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(userTablePreferenceUpsertMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        update: {
          hiddenColumnKeys: ["cost"],
          columnOrderKeys: ["qty", "name", "cost"],
        },
        create: {
          userId: "user-1",
          tableKey: "products-main",
          hiddenColumnKeys: ["cost"],
          columnOrderKeys: ["qty", "name", "cost"],
        },
      }),
    )
    expect(payload).toEqual({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["qty", "name", "cost"],
      isAscendingSort: true,
      isGroupingEnabled: false,
      groupByKeys: [],
      filters: {},
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
