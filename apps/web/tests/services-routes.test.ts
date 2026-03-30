import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@builders/db"
import { GET, POST } from "@/app/api/flooring/services/route"
import { DELETE, PATCH } from "@/app/api/flooring/services/[id]/route"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const { requireRouteAccessMock, enforceRouteRateLimitMock, listServicesMock, createServiceEntryMock, updateServiceEntryMock, deleteServiceEntryMock } = vi.hoisted(() => ({
  requireRouteAccessMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  listServicesMock: vi.fn(),
  createServiceEntryMock: vi.fn(),
  updateServiceEntryMock: vi.fn(),
  deleteServiceEntryMock: vi.fn(),
}))

const routeAccess = {
  requestId: "req-1",
  user: {
    id: "user-1",
    email: "builder@example.com",
    role: "BUILDER",
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
}))

vi.mock("@/features/flooring/services/queries", () => ({
  listServices: listServicesMock,
}))

vi.mock("@/features/flooring/services/application/manage-service", () => ({
  createServiceEntry: createServiceEntryMock,
  updateServiceEntry: updateServiceEntryMock,
  deleteServiceEntry: deleteServiceEntryMock,
}))

function decimal(value: string) {
  return new Prisma.Decimal(value)
}

function serviceRecord(
  overrides: Partial<{
    id: string
    name: string
    unit: { id: string; name: string }
    baseCost: Prisma.Decimal
    notes: string | null
    createdAt: Date
    updatedAt: Date
    _count: { templateItems: number; workOrderItems: number }
  }> = {},
) {
  return {
    id: "svc-1",
    name: "Install",
    unit: { id: "unit-1", name: "Square Feet" },
    baseCost: decimal("9.50"),
    notes: null,
    createdAt: new Date("2026-03-19T00:00:00Z"),
    updatedAt: new Date("2026-03-19T00:00:00Z"),
    _count: { templateItems: 1, workOrderItems: 2 },
    ...overrides,
  }
}

describe("services routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRouteAccessMock.mockResolvedValue(routeAccess)
    enforceRouteRateLimitMock.mockResolvedValue(null)
  })

  it("GET returns normalized rows", async () => {
    listServicesMock.mockResolvedValue([
      {
        id: "svc-1",
        name: "Install",
        unitId: "unit-1",
        unitName: "Square Feet",
        baseCost: "9.50",
        notes: "",
        usageCount: 3,
        createdAt: "2026-03-19T00:00:00.000Z",
        updatedAt: "2026-03-19T00:00:00.000Z",
      },
    ])

    const response = await GET(new Request("http://localhost/api/flooring/services"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.services).toEqual([
      {
        id: "svc-1",
        name: "Install",
        unitId: "unit-1",
        unitName: "Square Feet",
        baseCost: "9.50",
        notes: "",
        usageCount: 3,
        createdAt: "2026-03-19T00:00:00.000Z",
        updatedAt: "2026-03-19T00:00:00.000Z",
      },
    ])
    expect(requireRouteAccessMock).toHaveBeenCalled()
  })

  it("POST requires name, unitId, and baseCost", async () => {
    const missingName = await POST(
      new Request("http://localhost/api/flooring/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: "unit-1", baseCost: "9.50" }),
      }),
    )
    expect((await missingName.json()).error).toBe("name is required")

    const missingUnit = await POST(
      new Request("http://localhost/api/flooring/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Install", baseCost: "9.50" }),
      }),
    )
    expect((await missingUnit.json()).error).toBe("unitId is required")

    const missingCost = await POST(
      new Request("http://localhost/api/flooring/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Install", unitId: "unit-1" }),
      }),
    )
    expect((await missingCost.json()).error).toBe("baseCost is required")

    expect(createServiceEntryMock).not.toHaveBeenCalled()
  })

  it("POST returns normalized payload", async () => {
    createServiceEntryMock.mockResolvedValue({
      id: "svc-1",
      name: "Install",
      unitId: "unit-1",
      unitName: "Square Feet",
      baseCost: "9.5",
      notes: "",
      usageCount: 3,
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z",
    })

    const response = await POST(
      new Request("http://localhost/api/flooring/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Install", unitId: "unit-1", baseCost: "9.50", notes: "" }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(createServiceEntryMock).toHaveBeenCalledWith({
      name: "Install",
      unitId: "unit-1",
      baseCost: "9.50",
      notes: null,
    })
    expect(payload.service).toEqual({
      id: "svc-1",
      name: "Install",
      unitId: "unit-1",
      unitName: "Square Feet",
      baseCost: "9.5",
      notes: "",
      usageCount: 3,
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z",
    })
  })

  it("PATCH requires name, unitId, and baseCost", async () => {
    const missingName = await PATCH(
      new Request("http://localhost/api/flooring/services/svc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: "unit-1", baseCost: "9.50" }),
      }),
      { params: Promise.resolve({ id: "svc-1" }) },
    )
    expect((await missingName.json()).error).toBe("name is required")

    const missingUnit = await PATCH(
      new Request("http://localhost/api/flooring/services/svc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Install", baseCost: "9.50" }),
      }),
      { params: Promise.resolve({ id: "svc-1" }) },
    )
    expect((await missingUnit.json()).error).toBe("unitId is required")

    const missingCost = await PATCH(
      new Request("http://localhost/api/flooring/services/svc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Install", unitId: "unit-1" }),
      }),
      { params: Promise.resolve({ id: "svc-1" }) },
    )
    expect((await missingCost.json()).error).toBe("baseCost is required")

    expect(updateServiceEntryMock).not.toHaveBeenCalled()
  })

  it("PATCH returns normalized payload", async () => {
    updateServiceEntryMock.mockResolvedValue({
      id: "svc-1",
      name: "Repair",
      unitId: "unit-1",
      unitName: "Square Feet",
      baseCost: "12",
      notes: "Rush",
      usageCount: 3,
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z",
    })

    const response = await PATCH(
      new Request("http://localhost/api/flooring/services/svc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Repair", unitId: "unit-1", baseCost: "12.00", notes: "Rush" }),
      }),
      { params: Promise.resolve({ id: "svc-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(updateServiceEntryMock).toHaveBeenCalledWith("svc-1", {
      name: "Repair",
      unitId: "unit-1",
      baseCost: "12.00",
      notes: "Rush",
    })
    expect(payload.service.name).toBe("Repair")
    expect(payload.service.baseCost).toBe("12")
  })

  it("DELETE succeeds on happy path", async () => {
    const response = await DELETE(new Request("http://localhost/api/flooring/services/svc-1"), {
      params: Promise.resolve({ id: "svc-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true })
    expect(deleteServiceEntryMock).toHaveBeenCalledWith("svc-1")
  })

  it("DELETE normalizes linked-record conflicts", async () => {
    deleteServiceEntryMock.mockRejectedValue({
      kind: "app",
      status: 409,
      message: "This service is linked to work orders and cannot be deleted",
    })

    const response = await DELETE(new Request("http://localhost/api/flooring/services/svc-1"), {
      params: Promise.resolve({ id: "svc-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This service is linked to work orders and cannot be deleted")
  })
})
