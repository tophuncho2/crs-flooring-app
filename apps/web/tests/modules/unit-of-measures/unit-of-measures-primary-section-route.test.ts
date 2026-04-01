import { beforeEach, describe, expect, it, vi } from "vitest"
import { PATCH } from "@/app/api/builder/unit-of-measures/[id]/primary/section/route"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const {
  applyRoutePolicyMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  getUnitOfMeasureByIdMock,
  replaceUnitOfMeasurePrimarySectionMock,
  withMutationTelemetryMock,
} = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  getUnitOfMeasureByIdMock: vi.fn(),
  replaceUnitOfMeasurePrimarySectionMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
}))

vi.mock("@/modules/unit-of-measures/data/queries", () => ({
  getUnitOfMeasureById: getUnitOfMeasureByIdMock,
}))

vi.mock("@/modules/unit-of-measures/application/manage-unit-of-measure", () => ({
  replaceUnitOfMeasurePrimarySection: replaceUnitOfMeasurePrimarySectionMock,
  validateUpdateUnitOfMeasurePrimarySectionInput: vi.fn((body: Record<string, unknown>) => {
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
    email: "owner@example.com",
    role: "OWNER",
    isVerified: true,
    tools: [],
  },
  clientIp: "127.0.0.1",
} as const

function unitOfMeasureRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Square Feet",
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("unit-of-measures primary section route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    applyRoutePolicyMock.mockResolvedValue(routeAccess)
    enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash" })
    finalizeMutationReceiptMock.mockResolvedValue(undefined)
    withMutationTelemetryMock.mockImplementation(async (_access, _meta, callback) => callback())
  })

  it("accepts the mutation envelope and returns the authoritative snapshot", async () => {
    getUnitOfMeasureByIdMock
      .mockResolvedValueOnce(unitOfMeasureRow())
      .mockResolvedValueOnce(unitOfMeasureRow({ name: "Hour", updatedAt: "2026-03-20T00:00:00.000Z" }))

    const response = await PATCH(
      new Request("http://localhost/api/builder/unit-of-measures/11111111-1111-4111-8111-111111111111/primary/section", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Hour",
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(replaceUnitOfMeasurePrimarySectionMock).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", {
      name: "Hour",
    })
    expect(payload.unitOfMeasure.name).toBe("Hour")
  })

  it("normalizes stale revision conflicts", async () => {
    getUnitOfMeasureByIdMock.mockResolvedValue(unitOfMeasureRow({ updatedAt: "2026-03-21T00:00:00.000Z" }))

    const response = await PATCH(
      new Request("http://localhost/api/builder/unit-of-measures/11111111-1111-4111-8111-111111111111/primary/section", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Hour",
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Unit of measure changed before section save completed. Refresh and try again.")
  })

  it("normalizes validation failures", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/builder/unit-of-measures/11111111-1111-4111-8111-111111111111/primary/section", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required")
  })
})
