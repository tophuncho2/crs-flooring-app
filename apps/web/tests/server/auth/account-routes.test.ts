import { Prisma } from "@builders/db"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  applyRoutePolicyMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  userUpdateMock,
  getTablePreferenceRecordMock,
  getLegacyTablePreferenceRecordMock,
  upsertTablePreferenceRecordMock,
  upsertLegacyTablePreferenceRecordMock,
} = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  userUpdateMock: vi.fn(),
  getTablePreferenceRecordMock: vi.fn(),
  getLegacyTablePreferenceRecordMock: vi.fn(),
  upsertTablePreferenceRecordMock: vi.fn(),
  upsertLegacyTablePreferenceRecordMock: vi.fn(),
}))

vi.mock("@/server/http/route-policy", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/http/route-policy")>()
  return {
    ...actual,
    applyRoutePolicy: applyRoutePolicyMock,
    enforceMutationReceipt: enforceMutationReceiptMock,
    finalizeMutationReceipt: finalizeMutationReceiptMock,
  }
})

vi.mock("@/server/platform/logger", () => ({
  logEvent: vi.fn(),
}))

vi.mock("@builders/db", async () => {
  const actual = await vi.importActual<typeof import("@builders/db")>("@builders/db")
  return {
    ...actual,
    prisma: {
      user: {
        update: userUpdateMock,
      },
    },
    db: {
      user: {
        update: userUpdateMock,
      },
    },
    getTablePreferenceRecord: getTablePreferenceRecordMock,
    getLegacyTablePreferenceRecord: getLegacyTablePreferenceRecordMock,
    upsertTablePreferenceRecord: upsertTablePreferenceRecordMock,
    upsertLegacyTablePreferenceRecord: upsertLegacyTablePreferenceRecordMock,
  }
})

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
    enforceMutationReceiptMock.mockResolvedValue({ replay: null })
    finalizeMutationReceiptMock.mockResolvedValue(undefined)
  })

  it("GET /api/account/table-preferences/[tableKey] returns the saved preference", async () => {
    getTablePreferenceRecordMock.mockResolvedValue({
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
      sort: {
        key: "",
        direction: "desc",
      },
      filters: { status: ["pending"] },
      columnVisibility: {
        name: true,
        cost: false,
      },
      columnOrder: ["name", "cost"],
      grouping: {
        enabled: true,
        keys: ["warehouse"],
      },
    })
  })

  it("PATCH /api/account/table-preferences/[tableKey] rejects invalid column keys", async () => {
    getTablePreferenceRecordMock.mockResolvedValue({
      hiddenColumnKeys: [],
      columnOrderKeys: [],
      isAscendingSort: true,
      isGroupingEnabled: false,
      groupByKeys: [],
      filtersJson: null,
    })
    upsertTablePreferenceRecordMock.mockResolvedValue({
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
          mutation: { idempotencyKey: "idem-1" },
          state: {
            columnVisibility: {
              cost: false,
              bad: false,
            },
            columnOrder: ["qty", "bad", "name"],
          },
          allowedColumnKeys: ["name", "qty", "cost"],
        }),
      }),
      { params: Promise.resolve({ tableKey: "products-main" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("Invalid request body")
    expect(upsertTablePreferenceRecordMock).not.toHaveBeenCalled()
  })

  it("PATCH /api/account/table-preferences/[tableKey] merges valid sort, grouping, and filters into the existing preference", async () => {
    getTablePreferenceRecordMock.mockResolvedValue({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["name", "cost"],
      isAscendingSort: true,
      isGroupingEnabled: false,
      groupByKeys: [],
      filtersJson: null,
    })
    upsertTablePreferenceRecordMock.mockResolvedValue({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["name", "cost"],
      isAscendingSort: false,
      isGroupingEnabled: true,
      groupByKeys: ["warehouse"],
      filtersJson: { status: ["pending"], warehouseId: ["wh-1"] },
    })

    const response = await PATCH_TABLE_PREFERENCE(
      new Request("http://localhost/api/account/table-preferences/inventory-main", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: { idempotencyKey: "idem-2" },
          state: {
            columnVisibility: {
              name: true,
              cost: false,
            },
            columnOrder: ["name", "cost"],
            sort: {
              key: "itemNumber",
              direction: "desc",
            },
            grouping: {
              enabled: true,
              keys: ["warehouse"],
            },
            filters: {
              status: ["pending"],
              warehouseId: ["wh-1"],
            },
          },
          allowedColumnKeys: ["name", "cost"],
          allowedSortKeys: ["itemNumber"],
          allowedGroupKeys: ["warehouse", "status"],
          allowedFilterValues: {
            status: ["pending", "final"],
            warehouseId: ["wh-1"],
          },
        }),
      }),
      { params: Promise.resolve({ tableKey: "inventory-main" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(upsertTablePreferenceRecordMock).toHaveBeenCalledWith(
      "user-1",
      "inventory-main",
      expect.objectContaining({
        hiddenColumnKeys: ["cost"],
        columnOrderKeys: ["name", "cost"],
        isAscendingSort: false,
        isGroupingEnabled: true,
        groupByKeys: ["warehouse"],
        filtersJson: { status: ["pending"], warehouseId: ["wh-1"] },
      }),
      expect.anything(),
    )
    expect(payload).toEqual({
      sort: {
        key: "itemNumber",
        direction: "desc",
      },
      filters: {
        status: ["pending"],
        warehouseId: ["wh-1"],
      },
      columnVisibility: {
        name: true,
        cost: false,
      },
      columnOrder: ["name", "cost"],
      grouping: {
        enabled: true,
        keys: ["warehouse"],
      },
    })
  })

  it("GET /api/account/table-preferences/[tableKey] falls back to legacy columns when view-state columns are not in the database yet", async () => {
    getTablePreferenceRecordMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError(
        "The column `UserTablePreference.isAscendingSort` does not exist in the current database.",
        {
          code: "P2022",
          clientVersion: "6.12.0",
        },
      ),
    )
    getLegacyTablePreferenceRecordMock.mockResolvedValueOnce({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["name", "cost"],
    })

    const response = await GET_TABLE_PREFERENCE(new Request("http://localhost/api/account/table-preferences/products-main"), {
      params: Promise.resolve({ tableKey: "products-main" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      sort: {
        key: "",
        direction: "asc",
      },
      filters: {},
      columnVisibility: {
        name: true,
        cost: false,
      },
      columnOrder: ["name", "cost"],
      grouping: {
        enabled: false,
        keys: [],
      },
    })
    expect(getTablePreferenceRecordMock).toHaveBeenCalledTimes(1)
    expect(getLegacyTablePreferenceRecordMock).toHaveBeenCalledTimes(1)
  })

  it("PATCH /api/account/table-preferences/[tableKey] falls back to legacy writes when view-state columns are not in the database yet", async () => {
    getTablePreferenceRecordMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError(
        "The column `UserTablePreference.isAscendingSort` does not exist in the current database.",
        {
          code: "P2022",
          clientVersion: "6.12.0",
        },
      ),
    )
    getLegacyTablePreferenceRecordMock.mockResolvedValueOnce({
      hiddenColumnKeys: [],
      columnOrderKeys: [],
    })
    upsertTablePreferenceRecordMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError(
        "The column `UserTablePreference.isAscendingSort` does not exist in the current database.",
        {
          code: "P2022",
          clientVersion: "6.12.0",
        },
      ),
    )
    upsertLegacyTablePreferenceRecordMock.mockResolvedValueOnce({
      hiddenColumnKeys: ["cost"],
      columnOrderKeys: ["qty", "name", "cost"],
    })

    const response = await PATCH_TABLE_PREFERENCE(
      new Request("http://localhost/api/account/table-preferences/products-main", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: { idempotencyKey: "idem-3" },
          state: {
            columnVisibility: {
              qty: true,
              name: true,
              cost: false,
            },
            columnOrder: ["qty", "name", "cost"],
            sort: {
              key: "name",
              direction: "desc",
            },
            filters: { status: ["pending"] },
          },
          allowedColumnKeys: ["name", "qty", "cost"],
          allowedSortKeys: ["name"],
          allowedFilterValues: {
            status: ["pending"],
          },
        }),
      }),
      { params: Promise.resolve({ tableKey: "products-main" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(upsertLegacyTablePreferenceRecordMock).toHaveBeenCalledWith(
      "user-1",
      "products-main",
      {
        hiddenColumnKeys: ["cost"],
        columnOrderKeys: ["qty", "name", "cost"],
      },
      expect.anything(),
    )
    expect(payload).toEqual({
      sort: {
        key: "name",
        direction: "desc",
      },
      filters: {},
      columnVisibility: {
        qty: true,
        name: true,
        cost: false,
      },
      columnOrder: ["qty", "name", "cost"],
      grouping: {
        enabled: false,
        keys: [],
      },
    })
  })

  it("PATCH /api/account/flooring-nav filters unknown slugs and returns the normalized preference", async () => {
    userUpdateMock.mockResolvedValue({
      hiddenFlooringNavSlugs: ["flooring-inventory"],
      flooringNavOrderSlugs: ["products", "flooring-templates", "flooring-inventory"],
    })

    const response = await PATCH_FLOORING_NAV(
      new Request("http://localhost/api/account/flooring-nav", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: { idempotencyKey: "idem-4" },
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
      orderedSlugs: ["products", "flooring-templates", "flooring-inventory"],
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
