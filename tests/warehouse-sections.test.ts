import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET, POST } from "@/app/api/flooring/sections/route"
import { DELETE, PATCH } from "@/app/api/flooring/sections/[id]/route"

const { prismaMock, ensureBuilderOrAdminMock } = vi.hoisted(() => ({
  prismaMock: {
    flooringSection: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
  ensureBuilderOrAdminMock: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: prismaMock,
}))

vi.mock("@/server/auth/route-auth", () => ({
  ensureBuilderOrAdmin: ensureBuilderOrAdminMock,
}))

function sectionRecord(
  overrides: Partial<{
    id: string
    warehouseId: string
    name: string
    _count: { locations: number }
  }> = {},
) {
  return {
    id: "sec-1",
    warehouseId: "wh-1",
    name: "Showroom",
    _count: { locations: 2 },
    ...overrides,
  }
}

describe("warehouse sections routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureBuilderOrAdminMock.mockResolvedValue(null)
  })

  it("GET returns normalized rows with locationsCount", async () => {
    prismaMock.flooringSection.findMany.mockResolvedValue([
      sectionRecord(),
      sectionRecord({ id: "sec-2", name: "Storage", _count: { locations: 0 } }),
    ])

    const response = await GET(new Request("http://localhost/api/flooring/sections"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.sections).toEqual([
      { id: "sec-1", warehouseId: "wh-1", name: "Showroom", locationsCount: 2 },
      { id: "sec-2", warehouseId: "wh-1", name: "Storage", locationsCount: 0 },
    ])
  })

  it("GET filters correctly by warehouseId", async () => {
    prismaMock.flooringSection.findMany.mockResolvedValue([])

    await GET(new Request("http://localhost/api/flooring/sections?warehouseId=wh-9"))

    expect(prismaMock.flooringSection.findMany).toHaveBeenCalledWith({
      where: { warehouseId: "wh-9" },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        warehouseId: true,
        name: true,
        _count: { select: { locations: true } },
      },
    })
  })

  it("POST requires warehouseId", async () => {
    const response = await POST(
      new Request("http://localhost/api/flooring/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Showroom" }),
      }),
    )

    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("warehouseId is required")
    expect(prismaMock.flooringSection.create).not.toHaveBeenCalled()
  })

  it("POST requires name", async () => {
    const response = await POST(
      new Request("http://localhost/api/flooring/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId: "wh-1", name: "   " }),
      }),
    )

    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required")
    expect(prismaMock.flooringSection.create).not.toHaveBeenCalled()
  })

  it("POST returns 201 with normalized section payload", async () => {
    prismaMock.flooringSection.create.mockResolvedValue(sectionRecord({ _count: { locations: 0 } }))

    const response = await POST(
      new Request("http://localhost/api/flooring/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId: "wh-1", name: " Showroom " }),
      }),
    )

    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(prismaMock.flooringSection.create).toHaveBeenCalledWith({
      data: { warehouseId: "wh-1", name: "Showroom" },
      select: {
        id: true,
        warehouseId: true,
        name: true,
        _count: { select: { locations: true } },
      },
    })
    expect(payload.section).toEqual({
      id: "sec-1",
      warehouseId: "wh-1",
      name: "Showroom",
      locationsCount: 0,
    })
  })

  it("PATCH updates name and returns normalized payload", async () => {
    prismaMock.flooringSection.update.mockResolvedValue(sectionRecord({ name: "Updated", _count: { locations: 3 } }))

    const response = await PATCH(
      new Request("http://localhost/api/flooring/sections/sec-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: " Updated " }),
      }),
      { params: Promise.resolve({ id: "sec-1" }) },
    )

    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(prismaMock.flooringSection.update).toHaveBeenCalledWith({
      where: { id: "sec-1" },
      data: { name: "Updated" },
      select: {
        id: true,
        warehouseId: true,
        name: true,
        _count: { select: { locations: true } },
      },
    })
    expect(payload.section).toEqual({
      id: "sec-1",
      warehouseId: "wh-1",
      name: "Updated",
      locationsCount: 3,
    })
  })

  it("DELETE returns 404 when section is missing", async () => {
    prismaMock.flooringSection.findUnique.mockResolvedValue(null)

    const response = await DELETE(new Request("http://localhost/api/flooring/sections/sec-1"), {
      params: Promise.resolve({ id: "sec-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.error).toBe("Section not found")
    expect(prismaMock.flooringSection.delete).not.toHaveBeenCalled()
  })

  it("DELETE returns 409 when section has linked locations", async () => {
    prismaMock.flooringSection.findUnique.mockResolvedValue({
      id: "sec-1",
      warehouseId: "wh-1",
      _count: { locations: 1 },
    })

    const response = await DELETE(new Request("http://localhost/api/flooring/sections/sec-1"), {
      params: Promise.resolve({ id: "sec-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Section cannot be deleted while locations are linked to it")
    expect(prismaMock.flooringSection.delete).not.toHaveBeenCalled()
  })

  it("DELETE succeeds when section has zero linked locations", async () => {
    prismaMock.flooringSection.findUnique.mockResolvedValue({
      id: "sec-1",
      warehouseId: "wh-1",
      _count: { locations: 0 },
    })

    const response = await DELETE(new Request("http://localhost/api/flooring/sections/sec-1"), {
      params: Promise.resolve({ id: "sec-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(prismaMock.flooringSection.delete).toHaveBeenCalledWith({ where: { id: "sec-1" } })
    expect(payload).toEqual({
      ok: true,
      sectionId: "sec-1",
      warehouseId: "wh-1",
    })
  })
})
