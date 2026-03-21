import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"
import { GET, POST } from "@/app/api/builder/unit-of-measures/route"
import { DELETE, PATCH } from "@/app/api/builder/unit-of-measures/[id]/route"

const { prismaMock, ensureBuilderOrAdminMock, ensureGovernanceUserMock } = vi.hoisted(() => ({
  prismaMock: {
    flooringUnitOfMeasure: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    flooringCategory: {
      delete: vi.fn(),
    },
  },
  ensureBuilderOrAdminMock: vi.fn(),
  ensureGovernanceUserMock: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: prismaMock,
}))

vi.mock("@/server/auth/route-auth", () => ({
  ensureBuilderOrAdmin: ensureBuilderOrAdminMock,
  ensureGovernanceUser: ensureGovernanceUserMock,
}))

function unitRecord(
  overrides: Partial<{
    id: string
    name: string
    createdAt: Date
  }> = {},
) {
  return {
    id: "u-1",
    name: "Square Feet",
    createdAt: new Date("2026-03-19T00:00:00Z"),
    ...overrides,
  }
}

describe("unit-of-measures routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureBuilderOrAdminMock.mockResolvedValue(null)
    ensureGovernanceUserMock.mockResolvedValue(null)
  })

  it("GET returns normalized rows", async () => {
    prismaMock.flooringUnitOfMeasure.findMany.mockResolvedValue([
      unitRecord(),
      unitRecord({ id: "u-2", name: "Hour" }),
    ])

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.unitOfMeasures).toEqual([
      { id: "u-1", name: "Square Feet", createdAt: "2026-03-19T00:00:00.000Z" },
      { id: "u-2", name: "Hour", createdAt: "2026-03-19T00:00:00.000Z" },
    ])
    expect(ensureBuilderOrAdminMock).toHaveBeenCalledWith({ toolSlug: "products" })
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
    expect(ensureGovernanceUserMock).toHaveBeenCalled()
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
    })
    expect(ensureGovernanceUserMock).toHaveBeenCalled()
  })

  it("PATCH requires name", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/builder/unit-of-measures/u-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "   " }),
      }),
      { params: Promise.resolve({ id: "u-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required")
    expect(prismaMock.flooringUnitOfMeasure.update).not.toHaveBeenCalled()
  })

  it("PATCH returns normalized payload", async () => {
    prismaMock.flooringUnitOfMeasure.update.mockResolvedValue(unitRecord({ name: "Hour" }))

    const response = await PATCH(
      new Request("http://localhost/api/builder/unit-of-measures/u-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Hour" }),
      }),
      { params: Promise.resolve({ id: "u-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.unitOfMeasure).toEqual({
      id: "u-1",
      name: "Hour",
      createdAt: "2026-03-19T00:00:00.000Z",
    })
    expect(ensureGovernanceUserMock).toHaveBeenCalled()
  })

  it("DELETE succeeds on happy path only when there is no linkage", async () => {
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

    const response = await DELETE(new Request("http://localhost/api/builder/unit-of-measures/u-1"), {
      params: Promise.resolve({ id: "u-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ success: true })
    expect(prismaMock.flooringUnitOfMeasure.delete).toHaveBeenCalledWith({ where: { id: "u-1" } })
    expect(prismaMock.flooringCategory.delete).not.toHaveBeenCalled()
    expect(ensureGovernanceUserMock).toHaveBeenCalled()
  })

  it("DELETE is blocked when linked to categories", async () => {
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

    const response = await DELETE(new Request("http://localhost/api/builder/unit-of-measures/u-1"), {
      params: Promise.resolve({ id: "u-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This unit of measure is linked to categories and cannot be deleted")
    expect(prismaMock.flooringUnitOfMeasure.delete).not.toHaveBeenCalled()
    expect(ensureGovernanceUserMock).toHaveBeenCalled()
  })

  it("DELETE is blocked when linked to a representative service relation", async () => {
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

    const response = await DELETE(new Request("http://localhost/api/builder/unit-of-measures/u-1"), {
      params: Promise.resolve({ id: "u-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This unit of measure is linked and cannot be deleted")
    expect(prismaMock.flooringUnitOfMeasure.delete).not.toHaveBeenCalled()
    expect(ensureGovernanceUserMock).toHaveBeenCalled()
  })

  it("normalizes unit name conflicts", async () => {
    prismaMock.flooringUnitOfMeasure.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`name`)", {
        code: "P2002",
        clientVersion: "5.22.0",
        meta: { target: ["name"] },
      }),
    )

    const response = await POST(
      new Request("http://localhost/api/builder/unit-of-measures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Square Feet" }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Name must be unique")
  })
})
