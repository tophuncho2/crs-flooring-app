import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET, POST } from "@/app/api/builder/unit-of-measures/route"
import { DELETE, PATCH } from "@/app/api/builder/unit-of-measures/[id]/route"

const { prismaMock, applyRoutePolicyMock, enforceMutationReceiptMock, finalizeMutationReceiptMock } = vi.hoisted(() => ({
  prismaMock: {
    flooringUnitOfMeasure: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      delete: vi.fn(),
    },
  },
  applyRoutePolicyMock: vi.fn(),
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

vi.mock("@/server/http/route-policy", async () => {
  const actual = await vi.importActual<typeof import("@/server/http/route-policy")>("@/server/http/route-policy")
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

function unitRecord(
  overrides: Partial<{
    id: string
    name: string
    createdAt: Date
    updatedAt: Date
  }> = {},
) {
  return {
    id: "u-1",
    name: "Square Feet",
    createdAt: new Date("2026-03-19T00:00:00Z"),
    updatedAt: new Date("2026-03-19T00:00:00Z"),
    ...overrides,
  }
}

describe("unit-of-measures routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    applyRoutePolicyMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: {
        id: "admin-1",
        email: "admin@test.com",
        role: "ADMIN",
        isVerified: true,
      },
    })
    enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash" })
    finalizeMutationReceiptMock.mockResolvedValue(undefined)
  })

  it("GET returns normalized rows", async () => {
    prismaMock.flooringUnitOfMeasure.findMany.mockResolvedValue([
      unitRecord(),
      unitRecord({ id: "u-2", name: "Hour" }),
    ])

    const response = await GET(new Request("http://localhost/api/builder/unit-of-measures"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.unitOfMeasures).toEqual([
      {
        id: "u-1",
        name: "Square Feet",
        createdAt: "2026-03-19T00:00:00.000Z",
        updatedAt: "2026-03-19T00:00:00.000Z",
      },
      { id: "u-2", name: "Hour", createdAt: "2026-03-19T00:00:00.000Z", updatedAt: "2026-03-19T00:00:00.000Z" },
    ])
    expect(applyRoutePolicyMock).toHaveBeenCalled()
  })

  it("POST requires name", async () => {
    const response = await POST(
      new Request("http://localhost/api/builder/unit-of-measures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required")
    expect(prismaMock.flooringUnitOfMeasure.create).not.toHaveBeenCalled()
  })

  it("POST returns normalized payload", async () => {
    prismaMock.flooringUnitOfMeasure.create.mockResolvedValue(unitRecord())

    const response = await POST(
      new Request("http://localhost/api/builder/unit-of-measures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Square Feet" }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.unitOfMeasure).toEqual({
      id: "u-1",
      name: "Square Feet",
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z",
    })
  })

  it("PATCH requires name", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/builder/unit-of-measures/u-1", {
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
      { params: Promise.resolve({ id: "u-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required")
    expect(prismaMock.flooringUnitOfMeasure.update).not.toHaveBeenCalled()
  })

  it("PATCH returns normalized payload", async () => {
    prismaMock.flooringUnitOfMeasure.findUniqueOrThrow
      .mockResolvedValueOnce(unitRecord())
      .mockResolvedValueOnce(unitRecord({ name: "Hour" }))

    const response = await PATCH(
      new Request("http://localhost/api/builder/unit-of-measures/u-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Hour",
          mutation: {
            idempotencyKey: "idem-2",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "u-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.unitOfMeasure).toEqual({
      id: "u-1",
      name: "Hour",
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z",
    })
  })

  it("DELETE succeeds on happy path only when there is no linkage", async () => {
    prismaMock.flooringUnitOfMeasure.findUniqueOrThrow.mockResolvedValue(unitRecord())
    prismaMock.flooringUnitOfMeasure.findUnique.mockResolvedValue({
      id: "u-1",
      _count: {
        sendUnitCategories: 0,
        stockUnitCategories: 0,
        coverageAvailableUnitCategories: 0,
        itemCoverageUnitCategories: 0,
        serviceUnitCategories: 0,
        services: 0,
        templateServiceItems: 0,
        workOrderServiceItems: 0,
      },
    })

    const response = await DELETE(
      new Request("http://localhost/api/builder/unit-of-measures/u-1", {
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
        params: Promise.resolve({ id: "u-1" }),
      },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true })
    expect(prismaMock.flooringUnitOfMeasure.delete).toHaveBeenCalledWith({ where: { id: "u-1" } })
  })

  it("DELETE is blocked when linked to categories", async () => {
    prismaMock.flooringUnitOfMeasure.findUniqueOrThrow.mockResolvedValue(unitRecord())
    prismaMock.flooringUnitOfMeasure.findUnique.mockResolvedValue({
      id: "u-1",
      _count: {
        sendUnitCategories: 1,
        stockUnitCategories: 0,
        coverageAvailableUnitCategories: 0,
        itemCoverageUnitCategories: 0,
        serviceUnitCategories: 0,
        services: 0,
        templateServiceItems: 0,
        workOrderServiceItems: 0,
      },
    })

    const response = await DELETE(
      new Request("http://localhost/api/builder/unit-of-measures/u-1", {
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
        params: Promise.resolve({ id: "u-1" }),
      },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This unit of measure is linked to categories and cannot be deleted")
    expect(prismaMock.flooringUnitOfMeasure.delete).not.toHaveBeenCalled()
  })

  it("DELETE is blocked when linked to a representative service relation", async () => {
    prismaMock.flooringUnitOfMeasure.findUniqueOrThrow.mockResolvedValue(unitRecord())
    prismaMock.flooringUnitOfMeasure.findUnique.mockResolvedValue({
      id: "u-1",
      _count: {
        sendUnitCategories: 0,
        stockUnitCategories: 0,
        coverageAvailableUnitCategories: 0,
        itemCoverageUnitCategories: 0,
        serviceUnitCategories: 0,
        services: 1,
        templateServiceItems: 0,
        workOrderServiceItems: 0,
      },
    })

    const response = await DELETE(
      new Request("http://localhost/api/builder/unit-of-measures/u-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "idem-5",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      {
        params: Promise.resolve({ id: "u-1" }),
      },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This unit of measure is linked and cannot be deleted")
    expect(prismaMock.flooringUnitOfMeasure.delete).not.toHaveBeenCalled()
  })

  it("enforces case-insensitive unit name uniqueness before create", async () => {
    prismaMock.flooringUnitOfMeasure.findFirst.mockResolvedValue({ id: "u-2" })

    const response = await POST(
      new Request("http://localhost/api/builder/unit-of-measures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Square Feet" }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Unit of measure must be unique")
    expect(prismaMock.flooringUnitOfMeasure.create).not.toHaveBeenCalled()
  })

  it("returns shared auth responses unchanged", async () => {
    applyRoutePolicyMock.mockResolvedValueOnce(Response.json({ error: "Forbidden" }, { status: 403 }))

    const response = await GET(new Request("http://localhost/api/builder/unit-of-measures"))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toBe("Forbidden")
  })
})
