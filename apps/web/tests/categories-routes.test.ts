import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET, POST } from "@/app/api/flooring/categories/route"
import { DELETE, PATCH } from "@/app/api/flooring/categories/[id]/route"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const {
  prismaMock,
  requireRouteAccessMock,
  enforceRouteRateLimitMock,
  logRouteMutationSuccessMock,
  logRouteMutationFailureMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
} = vi.hoisted(() => ({
  prismaMock: {
    flooringCategory: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  requireRouteAccessMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  logRouteMutationSuccessMock: vi.fn(),
  logRouteMutationFailureMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
}))

vi.mock("@builders/db", async () => {
  const actual = await vi.importActual<typeof import("@builders/db")>("@builders/db")
  return {
    ...actual,
    prisma: prismaMock,
    db: prismaMock,
  }
})

const routeAccess = {
  requestId: "req-1",
  user: {
    id: "user-1",
    email: "admin@example.com",
    role: "ADMIN",
    isVerified: true,
    tools: [],
  },
  clientIp: "127.0.0.1",
} as const

vi.mock("@/server/http/route-helpers", () => ({
  requireRouteAccess: requireRouteAccessMock,
  enforceRouteRateLimit: enforceRouteRateLimitMock,
  routeJson: vi.fn((_context, body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 })),
  routeError: vi.fn((_context, error) => mockRouteErrorResponse(error)),
  logRouteMutationSuccess: logRouteMutationSuccessMock,
  logRouteMutationFailure: logRouteMutationFailureMock,
}))

vi.mock("@/server/http/route-policy", async () => {
  const actual = await vi.importActual<typeof import("@/server/http/route-policy")>("@/server/http/route-policy")
  return {
    ...actual,
    enforceMutationReceipt: enforceMutationReceiptMock,
    finalizeMutationReceipt: finalizeMutationReceiptMock,
  }
})

function categoryRecord(
  overrides: Partial<{
    id: string
    name: string
    sendUnit: { id: string; name: string } | null
    stockUnit: { id: string; name: string } | null
    coverageAvailableUnit: { id: string; name: string } | null
    itemCoverageUnit: { id: string; name: string } | null
    serviceUnit: { id: string; name: string } | null
    createdAt: Date
    updatedAt: Date
    _count: { products: number }
  }> = {},
) {
  return {
    id: "cat-1",
    name: "Carpet",
    sendUnit: { id: "u-send", name: "SY" },
    stockUnit: null,
    coverageAvailableUnit: null,
    itemCoverageUnit: { id: "u-item", name: "SF" },
    serviceUnit: null,
    createdAt: new Date("2026-03-19T00:00:00Z"),
    updatedAt: new Date("2026-03-19T00:00:00Z"),
    _count: { products: 2 },
    ...overrides,
  }
}

describe("categories routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRouteAccessMock.mockResolvedValue(routeAccess)
    enforceRouteRateLimitMock.mockResolvedValue(null)
    enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash" })
    finalizeMutationReceiptMock.mockResolvedValue(undefined)
  })

  it("GET returns normalized category rows", async () => {
    prismaMock.flooringCategory.findMany.mockResolvedValue([
      categoryRecord(),
      categoryRecord({
        id: "cat-2",
        name: "Tile",
        sendUnit: null,
        itemCoverageUnit: null,
        serviceUnit: { id: "u-service", name: "Hour" },
        _count: { products: 0 },
      }),
    ])

    const response = await GET(new Request("http://localhost/api/flooring/categories"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.categories).toEqual([
      {
        id: "cat-1",
        name: "Carpet",
        sendUnitId: "u-send",
        stockUnitId: "",
        coverageAvailableUnitId: "",
        itemCoverageUnitId: "u-item",
        serviceUnitId: "",
        sendUnit: "SY",
        stockUnit: "",
        coverageAvailableUnit: "",
        itemCoverageUnit: "SF",
        serviceUnit: "",
        productCount: 2,
        createdAt: "2026-03-19T00:00:00.000Z",
        updatedAt: "2026-03-19T00:00:00.000Z",
      },
      {
        id: "cat-2",
        name: "Tile",
        sendUnitId: "",
        stockUnitId: "",
        coverageAvailableUnitId: "",
        itemCoverageUnitId: "",
        serviceUnitId: "u-service",
        sendUnit: "",
        stockUnit: "",
        coverageAvailableUnit: "",
        itemCoverageUnit: "",
        serviceUnit: "Hour",
        productCount: 0,
        createdAt: "2026-03-19T00:00:00.000Z",
        updatedAt: "2026-03-19T00:00:00.000Z",
      },
    ])
    expect(requireRouteAccessMock).toHaveBeenCalled()
  })

  it("POST requires name", async () => {
    const response = await POST(
      new Request("http://localhost/api/flooring/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendUnitId: "u-1" }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required")
    expect(prismaMock.flooringCategory.create).not.toHaveBeenCalled()
  })

  it("POST accepts optional unit ids as empty or null and returns normalized payload", async () => {
    prismaMock.flooringCategory.create.mockResolvedValue(
      categoryRecord({
        name: "Laminate",
        sendUnit: null,
        stockUnit: null,
        coverageAvailableUnit: null,
        itemCoverageUnit: null,
        serviceUnit: null,
        _count: { products: 0 },
      }),
    )

    const response = await POST(
      new Request("http://localhost/api/flooring/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Laminate",
          sendUnitId: "",
          stockUnitId: null,
          coverageAvailableUnitId: "",
          itemCoverageUnitId: null,
          serviceUnitId: "",
        }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(prismaMock.flooringCategory.create).toHaveBeenCalledWith({
      data: {
        name: "Laminate",
        sendUnitId: null,
        stockUnitId: null,
        coverageAvailableUnitId: null,
        itemCoverageUnitId: null,
        serviceUnitId: null,
      },
      include: {
        sendUnit: { select: { id: true, name: true } },
        stockUnit: { select: { id: true, name: true } },
        coverageAvailableUnit: { select: { id: true, name: true } },
        itemCoverageUnit: { select: { id: true, name: true } },
        serviceUnit: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
    })
    expect(payload.category).toMatchObject({
      name: "Laminate",
      sendUnitId: "",
      stockUnitId: "",
      coverageAvailableUnitId: "",
      itemCoverageUnitId: "",
      serviceUnitId: "",
      productCount: 0,
    })
  })

  it("PATCH requires name", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/flooring/categories/cat-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "   ",
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "cat-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required")
    expect(prismaMock.flooringCategory.update).not.toHaveBeenCalled()
  })

  it("PATCH returns normalized payload", async () => {
    prismaMock.flooringCategory.findUniqueOrThrow
      .mockResolvedValueOnce(categoryRecord())
      .mockResolvedValueOnce(
        categoryRecord({
          name: "Updated Carpet",
          stockUnit: { id: "u-stock", name: "Roll" },
          coverageAvailableUnit: { id: "u-cover", name: "Box" },
          serviceUnit: { id: "u-service", name: "Hour" },
        }),
      )

    const response = await PATCH(
      new Request("http://localhost/api/flooring/categories/cat-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Carpet",
          sendUnitId: "u-send",
          stockUnitId: "u-stock",
          coverageAvailableUnitId: "u-cover",
          itemCoverageUnitId: "u-item",
          serviceUnitId: "u-service",
          mutation: {
            idempotencyKey: "idem-2",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "cat-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.category).toMatchObject({
      id: "cat-1",
      name: "Updated Carpet",
      sendUnitId: "u-send",
      stockUnitId: "u-stock",
      coverageAvailableUnitId: "u-cover",
      itemCoverageUnitId: "u-item",
      serviceUnitId: "u-service",
      productCount: 2,
    })
  })

  it("DELETE succeeds on the happy path and does not affect unit-of-measure records", async () => {
    prismaMock.flooringCategory.findUniqueOrThrow.mockResolvedValue(categoryRecord({ _count: { products: 0 } }))
    prismaMock.flooringCategory.findUnique.mockResolvedValue({
      id: "cat-1",
      _count: {
        products: 0,
      },
    })

    const response = await DELETE(
      new Request("http://localhost/api/flooring/categories/cat-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "idem-3",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      {
        params: Promise.resolve({ id: "cat-1" }),
      },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true })
    expect(prismaMock.flooringCategory.findUnique).toHaveBeenCalledWith({
      where: { id: "cat-1" },
      select: {
        id: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    })
    expect(prismaMock.flooringCategory.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } })
    expect(requireRouteAccessMock).toHaveBeenCalled()
  })

  it("DELETE is blocked when the category is linked to products", async () => {
    prismaMock.flooringCategory.findUniqueOrThrow.mockResolvedValue(categoryRecord())
    prismaMock.flooringCategory.findUnique.mockResolvedValue({
      id: "cat-1",
      _count: {
        products: 2,
      },
    })

    const response = await DELETE(
      new Request("http://localhost/api/flooring/categories/cat-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "idem-4",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      {
        params: Promise.resolve({ id: "cat-1" }),
      },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This category is linked to products and cannot be deleted")
    expect(prismaMock.flooringCategory.delete).not.toHaveBeenCalled()
  })

  it("enforces case-insensitive category uniqueness before create", async () => {
    prismaMock.flooringCategory.findFirst.mockResolvedValue({ id: "cat-2" })

    const response = await POST(
      new Request("http://localhost/api/flooring/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Carpet" }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Category name must be unique")
    expect(prismaMock.flooringCategory.create).not.toHaveBeenCalled()
  })
})
