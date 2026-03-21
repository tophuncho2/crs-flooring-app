import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET, POST } from "@/app/api/flooring/locations/route"
import { DELETE, PATCH } from "@/app/api/flooring/locations/[id]/route"

const routeAccess = {
  requestId: "req-1",
  clientIp: "127.0.0.1",
  user: {
    id: "builder-1",
    email: "builder@test.com",
    role: "BUILDER",
    isVerified: true,
  },
} as const

const { prismaMock, requireRouteAccessMock, enforceRouteRateLimitMock } = vi.hoisted(() => ({
  prismaMock: {
    flooringLocation: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    flooringSection: {
      findUnique: vi.fn(),
    },
  },
  requireRouteAccessMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: prismaMock,
}))

vi.mock("@/server/http/route-helpers", () => ({
  requireRouteAccess: requireRouteAccessMock,
  enforceRouteRateLimit: enforceRouteRateLimitMock,
  routeJson: vi.fn((_context, body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 })),
  routeError: vi.fn((_context, error) =>
    new Response(
      JSON.stringify({
        error:
          error && typeof error === "object" && "message" in error ? String(error.message) : "Unexpected server error",
      }),
      {
        status:
          error && typeof error === "object" && "status" in error && typeof error.status === "number"
            ? error.status
            : 400,
      },
    ),
  ),
  logRouteMutationSuccess: vi.fn(),
  logRouteMutationFailure: vi.fn(),
}))

function locationRecord(
  overrides: Partial<{
    id: string
    warehouseId: string
    locationCode: string
    sectionId: string
    section: { name: string } | null
  }> = {},
) {
  return {
    id: "loc-1",
    warehouseId: "wh-1",
    locationCode: "A1",
    sectionId: "sec-1",
    section: { name: "Showroom" },
    ...overrides,
  }
}

describe("warehouse locations routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRouteAccessMock.mockResolvedValue(routeAccess)
    enforceRouteRateLimitMock.mockResolvedValue(null)
  })

  it("GET returns normalized rows with sectionName", async () => {
    prismaMock.flooringLocation.findMany.mockResolvedValue([
      locationRecord(),
      locationRecord({ id: "loc-2", locationCode: "B2", sectionId: "sec-2", section: { name: "Storage" } }),
    ])

    const response = await GET(new Request("http://localhost/api/flooring/locations"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.locations).toEqual([
      { id: "loc-1", warehouseId: "wh-1", locationCode: "A1", sectionId: "sec-1", sectionName: "Showroom" },
      { id: "loc-2", warehouseId: "wh-1", locationCode: "B2", sectionId: "sec-2", sectionName: "Storage" },
    ])
  })

  it("GET with warehouseId filters correctly", async () => {
    prismaMock.flooringLocation.findMany.mockResolvedValue([])

    await GET(new Request("http://localhost/api/flooring/locations?warehouseId=wh-2"))

    expect(prismaMock.flooringLocation.findMany).toHaveBeenCalledWith({
      where: { warehouseId: "wh-2" },
      orderBy: [{ section: { name: "asc" } }, { locationCode: "asc" }],
      select: {
        id: true,
        warehouseId: true,
        locationCode: true,
        sectionId: true,
        section: { select: { name: true } },
      },
    })
  })

  it("POST requires warehouseId, locationCode, and sectionId", async () => {
    const missingWarehouse = await POST(
      new Request("http://localhost/api/flooring/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationCode: "A1", sectionId: "sec-1" }),
      }),
    )
    const missingWarehousePayload = await missingWarehouse.json()

    expect(missingWarehouse.status).toBe(400)
    expect(missingWarehousePayload.error).toBe("warehouseId is required")

    const missingLocationCode = await POST(
      new Request("http://localhost/api/flooring/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId: "wh-1", sectionId: "sec-1" }),
      }),
    )
    const missingLocationCodePayload = await missingLocationCode.json()

    expect(missingLocationCode.status).toBe(400)
    expect(missingLocationCodePayload.error).toBe("locationCode is required")

    const missingSectionId = await POST(
      new Request("http://localhost/api/flooring/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId: "wh-1", locationCode: "A1" }),
      }),
    )
    const missingSectionIdPayload = await missingSectionId.json()

    expect(missingSectionId.status).toBe(400)
    expect(missingSectionIdPayload.error).toBe("sectionId is required")
    expect(prismaMock.flooringLocation.create).not.toHaveBeenCalled()
  })

  it("POST returns 400 if the selected section does not belong to the provided warehouse", async () => {
    prismaMock.flooringSection.findUnique.mockResolvedValue({
      id: "sec-1",
      warehouseId: "wh-2",
      name: "Storage",
    })

    const response = await POST(
      new Request("http://localhost/api/flooring/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId: "wh-1", locationCode: "A1", sectionId: "sec-1" }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("Selected section is invalid for this warehouse")
    expect(prismaMock.flooringLocation.create).not.toHaveBeenCalled()
  })

  it("POST succeeds when the section belongs to the warehouse", async () => {
    prismaMock.flooringSection.findUnique.mockResolvedValue({
      id: "sec-1",
      warehouseId: "wh-1",
      name: "Showroom",
    })
    prismaMock.flooringLocation.create.mockResolvedValue(locationRecord())

    const response = await POST(
      new Request("http://localhost/api/flooring/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId: "wh-1", locationCode: " A1 ", sectionId: "sec-1" }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(prismaMock.flooringLocation.create).toHaveBeenCalledWith({
      data: {
        warehouseId: "wh-1",
        sectionId: "sec-1",
        locationCode: "A1",
      },
      select: {
        id: true,
        warehouseId: true,
        locationCode: true,
        sectionId: true,
        section: { select: { name: true } },
      },
    })
    expect(payload.location).toEqual({
      id: "loc-1",
      warehouseId: "wh-1",
      locationCode: "A1",
      sectionId: "sec-1",
      sectionName: "Showroom",
    })
  })

  it("PATCH returns 404 when the location is missing", async () => {
    prismaMock.flooringLocation.findUnique.mockResolvedValue(null)

    const response = await PATCH(
      new Request("http://localhost/api/flooring/locations/loc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationCode: "B2" }),
      }),
      { params: Promise.resolve({ id: "loc-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.error).toBe("Location not found")
  })

  it("PATCH returns 400 when moving a location to a section in a different warehouse", async () => {
    prismaMock.flooringLocation.findUnique.mockResolvedValue({ warehouseId: "wh-1" })
    prismaMock.flooringSection.findUnique.mockResolvedValue({ warehouseId: "wh-2" })

    const response = await PATCH(
      new Request("http://localhost/api/flooring/locations/loc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: "sec-2" }),
      }),
      { params: Promise.resolve({ id: "loc-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("Selected section is invalid for this warehouse")
    expect(prismaMock.flooringLocation.update).not.toHaveBeenCalled()
  })

  it("PATCH succeeds for locationCode-only changes", async () => {
    prismaMock.flooringLocation.findUnique.mockResolvedValue({ warehouseId: "wh-1" })
    prismaMock.flooringLocation.update.mockResolvedValue(locationRecord({ locationCode: "B2" }))

    const response = await PATCH(
      new Request("http://localhost/api/flooring/locations/loc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationCode: " B2 " }),
      }),
      { params: Promise.resolve({ id: "loc-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(prismaMock.flooringLocation.update).toHaveBeenCalledWith({
      where: { id: "loc-1" },
      data: { locationCode: "B2" },
      select: {
        id: true,
        warehouseId: true,
        locationCode: true,
        sectionId: true,
        section: { select: { name: true } },
      },
    })
    expect(payload.location.locationCode).toBe("B2")
  })

  it("PATCH succeeds for valid section reassignment within the same warehouse", async () => {
    prismaMock.flooringLocation.findUnique.mockResolvedValue({ warehouseId: "wh-1" })
    prismaMock.flooringSection.findUnique.mockResolvedValue({ warehouseId: "wh-1" })
    prismaMock.flooringLocation.update.mockResolvedValue(
      locationRecord({ sectionId: "sec-2", section: { name: "Storage" } }),
    )

    const response = await PATCH(
      new Request("http://localhost/api/flooring/locations/loc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: "sec-2" }),
      }),
      { params: Promise.resolve({ id: "loc-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(prismaMock.flooringLocation.update).toHaveBeenCalledWith({
      where: { id: "loc-1" },
      data: { sectionId: "sec-2" },
      select: {
        id: true,
        warehouseId: true,
        locationCode: true,
        sectionId: true,
        section: { select: { name: true } },
      },
    })
    expect(payload.location).toEqual({
      id: "loc-1",
      warehouseId: "wh-1",
      locationCode: "A1",
      sectionId: "sec-2",
      sectionName: "Storage",
    })
  })

  it("DELETE returns 404 when missing", async () => {
    prismaMock.flooringLocation.findUnique.mockResolvedValue(null)

    const response = await DELETE(new Request("http://localhost/api/flooring/locations/loc-1"), {
      params: Promise.resolve({ id: "loc-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.error).toBe("Location not found")
  })

  it("DELETE succeeds and returns ok payload when present", async () => {
    prismaMock.flooringLocation.findUnique.mockResolvedValue({
      id: "loc-1",
      warehouseId: "wh-1",
      sectionId: "sec-1",
    })

    const response = await DELETE(new Request("http://localhost/api/flooring/locations/loc-1"), {
      params: Promise.resolve({ id: "loc-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(prismaMock.flooringLocation.delete).toHaveBeenCalledWith({ where: { id: "loc-1" } })
    expect(payload).toEqual({
      ok: true,
      locationId: "loc-1",
      warehouseId: "wh-1",
      sectionId: "sec-1",
    })
  })
})
