import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"
import { GET, POST } from "@/app/api/flooring/categories/route"
import { DELETE, PATCH } from "@/app/api/flooring/categories/[id]/route"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const { prismaMock, requireRouteAccessMock, enforceRouteRateLimitMock, logRouteMutationSuccessMock, logRouteMutationFailureMock } = vi.hoisted(() => ({
  prismaMock: {
    flooringCategory: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    flooringUnitOfMeasure: {
      delete: vi.fn(),
    },
  },
  requireRouteAccessMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  logRouteMutationSuccessMock: vi.fn(),
  logRouteMutationFailureMock: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: prismaMock,
}))

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
    _count: { products: 2 },
    ...overrides,
  }
}

describe("categories routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRouteAccessMock.mockResolvedValue(routeAccess)
    enforceRouteRateLimitMock.mockResolvedValue(null)
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
        body: JSON.stringify({ name: "   " }),
      }),
      { params: Promise.resolve({ id: "cat-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required")
    expect(prismaMock.flooringCategory.update).not.toHaveBeenCalled()
  })

  it("PATCH returns normalized payload", async () => {
    prismaMock.flooringCategory.update.mockResolvedValue(
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
    const response = await DELETE(new Request("http://localhost/api/flooring/categories/cat-1"), {
      params: Promise.resolve({ id: "cat-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ success: true })
    expect(prismaMock.flooringCategory.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } })
    expect(prismaMock.flooringUnitOfMeasure.delete).not.toHaveBeenCalled()
    expect(requireRouteAccessMock).toHaveBeenCalled()
  })

  it("normalizes category unique conflicts", async () => {
    prismaMock.flooringCategory.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`name`)", {
        code: "P2002",
        clientVersion: "5.22.0",
        meta: { target: ["name"] },
      }),
    )

    const response = await POST(
      new Request("http://localhost/api/flooring/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Carpet" }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Name must be unique")
  })
})
