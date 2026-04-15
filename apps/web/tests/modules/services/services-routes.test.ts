import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@builders/db"
import { GET, POST } from "@/app/api/services/route"
import { DELETE, PATCH } from "@/app/api/services/[id]/route"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const { applyRoutePolicyMock, enforceQueryRateLimitMock, listServicesMock, createServiceUseCaseMock, updateServiceUseCaseMock, deleteServiceUseCaseMock, getServiceByIdMock } = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  enforceQueryRateLimitMock: vi.fn(),
  listServicesMock: vi.fn(),
  createServiceUseCaseMock: vi.fn(),
  updateServiceUseCaseMock: vi.fn(),
  deleteServiceUseCaseMock: vi.fn(),
  getServiceByIdMock: vi.fn(),
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

vi.mock("@/server/http/route-policy", () => ({
  applyRoutePolicy: applyRoutePolicyMock,
  enforceQueryRateLimit: enforceQueryRateLimitMock,
  parseMutationEnvelope: vi.fn((body, parser) => ({
    input: parser(body),
    mutation: { idempotencyKey: "test-key", expectedUpdatedAt: body.mutation?.expectedUpdatedAt },
  })),
  enforceMutationReceipt: vi.fn().mockResolvedValue({ replay: null }),
  finalizeMutationReceipt: vi.fn().mockResolvedValue(undefined),
  assertExpectedUpdatedAt: vi.fn(),
}))

vi.mock("@/server/http/route-helpers", () => ({
  routeJson: vi.fn((_context, body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 })),
  routeError: vi.fn((_context, error) => mockRouteErrorResponse(error)),
}))

vi.mock("@/modules/shared/engines/common/application/mutation-telemetry", () => ({
  withMutationTelemetry: vi.fn((_access, _meta, fn) => fn()),
}))

vi.mock("@/modules/shared/access/lookup-domains", () => ({
  SERVICES_TOOL_SLUG: "warehouse",
}))

vi.mock("@/modules/services/data/queries", () => ({
  listServices: listServicesMock,
  getServiceById: getServiceByIdMock,
}))

vi.mock("@builders/application", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    createServiceUseCase: createServiceUseCaseMock,
    updateServiceUseCase: updateServiceUseCaseMock,
    deleteServiceUseCase: deleteServiceUseCaseMock,
  }
})

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
    applyRoutePolicyMock.mockResolvedValue(routeAccess)
    enforceQueryRateLimitMock.mockResolvedValue(null)
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

    const response = await GET(new Request("http://localhost/api/services"))
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
    expect(applyRoutePolicyMock).toHaveBeenCalled()
  })

  it("POST requires name, unitId, and baseCost", async () => {
    const missingName = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: "unit-1", baseCost: "9.50" }),
      }),
    )
    expect((await missingName.json()).error).toBe("name is required")

    const missingUnit = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Install", baseCost: "9.50" }),
      }),
    )
    expect((await missingUnit.json()).error).toBe("unitId is required")

    const missingCost = await POST(
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Install", unitId: "unit-1" }),
      }),
    )
    expect((await missingCost.json()).error).toBe("baseCost is required")

    expect(createServiceUseCaseMock).not.toHaveBeenCalled()
  })

  it("POST returns normalized payload", async () => {
    createServiceUseCaseMock.mockResolvedValue({
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
      new Request("http://localhost/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Install", unitId: "unit-1", baseCost: "9.50", notes: "" }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(createServiceUseCaseMock).toHaveBeenCalledWith({
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
      new Request("http://localhost/api/services/svc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: "unit-1", baseCost: "9.50" }),
      }),
      { params: Promise.resolve({ id: "svc-1" }) },
    )
    expect((await missingName.json()).error).toBe("name is required")

    const missingUnit = await PATCH(
      new Request("http://localhost/api/services/svc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Install", baseCost: "9.50" }),
      }),
      { params: Promise.resolve({ id: "svc-1" }) },
    )
    expect((await missingUnit.json()).error).toBe("unitId is required")

    const missingCost = await PATCH(
      new Request("http://localhost/api/services/svc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Install", unitId: "unit-1" }),
      }),
      { params: Promise.resolve({ id: "svc-1" }) },
    )
    expect((await missingCost.json()).error).toBe("baseCost is required")

    expect(updateServiceUseCaseMock).not.toHaveBeenCalled()
  })

  it("PATCH returns normalized payload", async () => {
    const snapshotRow = {
      id: "svc-1",
      name: "Repair",
      unitId: "unit-1",
      unitName: "Square Feet",
      baseCost: "12",
      notes: "Rush",
      usageCount: 3,
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z",
    }
    getServiceByIdMock.mockResolvedValue(snapshotRow)

    const response = await PATCH(
      new Request("http://localhost/api/services/svc-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Repair", unitId: "unit-1", baseCost: "12.00", notes: "Rush" }),
      }),
      { params: Promise.resolve({ id: "svc-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(updateServiceUseCaseMock).toHaveBeenCalledWith("svc-1", {
      name: "Repair",
      unitId: "unit-1",
      baseCost: "12.00",
      notes: "Rush",
    })
    expect(payload.service.name).toBe("Repair")
    expect(payload.service.baseCost).toBe("12")
  })

  it("DELETE succeeds on happy path", async () => {
    getServiceByIdMock.mockResolvedValue({
      id: "svc-1",
      updatedAt: "2026-03-19T00:00:00.000Z",
    })
    deleteServiceUseCaseMock.mockResolvedValue({ ok: true })

    const response = await DELETE(
      new Request("http://localhost/api/services/svc-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "svc-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true })
    expect(deleteServiceUseCaseMock).toHaveBeenCalledWith("svc-1")
  })

  it("DELETE normalizes linked-record conflicts", async () => {
    getServiceByIdMock.mockResolvedValue({
      id: "svc-1",
      updatedAt: "2026-03-19T00:00:00.000Z",
    })
    deleteServiceUseCaseMock.mockRejectedValue({
      kind: "app",
      status: 409,
      message: "This service is linked to work orders and cannot be deleted",
    })

    const response = await DELETE(
      new Request("http://localhost/api/services/svc-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "svc-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This service is linked to work orders and cannot be deleted")
  })
})
