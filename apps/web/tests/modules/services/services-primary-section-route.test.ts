import { beforeEach, describe, expect, it, vi } from "vitest"
import { PATCH } from "@/app/api/services/[id]/primary/section/route"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const {
  applyRoutePolicyMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  getServiceByIdMock,
  updateServiceUseCaseMock,
  withMutationTelemetryMock,
} = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  getServiceByIdMock: vi.fn(),
  updateServiceUseCaseMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
}))

vi.mock("@builders/db", async () => {
  const actual = await vi.importActual<typeof import("@builders/db")>("@builders/db")
  return {
    ...actual,
    getServiceById: getServiceByIdMock,
  }
})

vi.mock("@builders/application", async () => {
  const actual = await vi.importActual<typeof import("@builders/application")>("@builders/application")
  return {
    ...actual,
    updateServiceUseCase: updateServiceUseCaseMock,
  }
})

vi.mock("@/app/api/services/_validators", () => ({
  validateServiceInput: vi.fn((body: Record<string, unknown>) => {
    if (typeof body.name !== "string" || body.name.trim() === "") {
      throw {
        kind: "app",
        message: "name is required",
        field: "name",
        status: 400,
      }
    }
    return body
  }),
}))

vi.mock("@/modules/shared/engines/common/application/mutation-telemetry", () => ({
  withMutationTelemetry: withMutationTelemetryMock,
}))

vi.mock("@/server/http/route-helpers", () => ({
  routeJson: vi.fn((_context, body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 })),
  routeError: vi.fn((_context, error) => mockRouteErrorResponse(error)),
}))

vi.mock("@/server/http/route-policy", async () => {
  const actual = await vi.importActual<typeof import("@/server/http/route-policy")>("@/server/http/route-policy")
  return {
    ...actual,
    applyRoutePolicy: applyRoutePolicyMock,
    enforceMutationReceipt: enforceMutationReceiptMock,
    finalizeMutationReceipt: finalizeMutationReceiptMock,
  }
})

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

const SERVICE_ID = "11111111-1111-4111-8111-111111111111"
const UNIT_ID = "22222222-2222-4222-8222-222222222222"

function serviceRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: SERVICE_ID,
    name: "Install",
    unitId: UNIT_ID,
    unitName: "Square Feet",
    baseCost: "9.50",
    notes: "",
    usageCount: 0,
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("services primary section route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    applyRoutePolicyMock.mockResolvedValue(routeAccess)
    enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash" })
    finalizeMutationReceiptMock.mockResolvedValue(undefined)
    withMutationTelemetryMock.mockImplementation(async (_access, _meta, callback) => callback())
  })

  it("accepts the mutation envelope and returns the authoritative snapshot", async () => {
    getServiceByIdMock.mockResolvedValueOnce(serviceRow())
    updateServiceUseCaseMock.mockResolvedValueOnce(
      serviceRow({ name: "Repair", baseCost: "12", notes: "Rush", updatedAt: "2026-03-20T00:00:00.000Z" }),
    )

    const response = await PATCH(
      new Request(`http://localhost/api/services/${SERVICE_ID}/primary/section`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Repair",
          unitId: UNIT_ID,
          baseCost: "12.00",
          notes: "Rush",
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: SERVICE_ID }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(updateServiceUseCaseMock).toHaveBeenCalledWith(SERVICE_ID, {
      name: "Repair",
      unitId: UNIT_ID,
      baseCost: "12.00",
      notes: "Rush",
    })
    expect(payload.service.name).toBe("Repair")
    expect(payload.service.baseCost).toBe("12")
  })

  it("normalizes stale revision conflicts", async () => {
    getServiceByIdMock.mockResolvedValue(serviceRow({ updatedAt: "2026-03-25T00:00:00.000Z" }))

    const response = await PATCH(
      new Request(`http://localhost/api/services/${SERVICE_ID}/primary/section`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Repair",
          unitId: UNIT_ID,
          baseCost: "12.00",
          notes: "Rush",
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: SERVICE_ID }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Service changed before section save completed. Refresh and try again.")
    expect(updateServiceUseCaseMock).not.toHaveBeenCalled()
  })

  it("normalizes validation failures", async () => {
    const response = await PATCH(
      new Request(`http://localhost/api/services/${SERVICE_ID}/primary/section`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: SERVICE_ID }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required")
    expect(updateServiceUseCaseMock).not.toHaveBeenCalled()
  })
})
