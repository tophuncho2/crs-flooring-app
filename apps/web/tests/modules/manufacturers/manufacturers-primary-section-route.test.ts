import { beforeEach, describe, expect, it, vi } from "vitest"
import { PATCH } from "@/app/api/manufacturers/[id]/primary/section/route"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const {
  applyRoutePolicyMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  getManufacturerByIdMock,
  updateManufacturerUseCaseMock,
  withMutationTelemetryMock,
} = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  getManufacturerByIdMock: vi.fn(),
  updateManufacturerUseCaseMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
}))

vi.mock("@builders/db", async () => {
  const actual = await vi.importActual<typeof import("@builders/db")>("@builders/db")
  return {
    ...actual,
    getManufacturerById: getManufacturerByIdMock,
  }
})

vi.mock("@builders/application", async () => {
  const actual = await vi.importActual<typeof import("@builders/application")>("@builders/application")
  return {
    ...actual,
    updateManufacturerUseCase: updateManufacturerUseCaseMock,
  }
})

vi.mock("@/app/api/manufacturers/_validators", () => ({
  validateManufacturerInput: vi.fn((body: Record<string, unknown>) => {
    if (typeof body.companyName !== "string" || body.companyName.trim() === "") {
      throw {
        kind: "app",
        message: "companyName is required",
        field: "companyName",
        status: 400,
      }
    }

    return body
  }),
}))

vi.mock("@/server/telemetry/mutation-telemetry", () => ({
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
    rank: "DEVELOPER",
    isVerified: true,
    tools: [],
  },
  clientIp: "127.0.0.1",
} as const

function manufacturerRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    companyName: "Acme Flooring",
    agentName: "",
    website: "",
    phone: "",
    email: "",
    productsCount: 0,
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("manufacturers primary section route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    applyRoutePolicyMock.mockResolvedValue(routeAccess)
    enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash" })
    finalizeMutationReceiptMock.mockResolvedValue(undefined)
    withMutationTelemetryMock.mockImplementation(async (_access, _meta, callback) => callback())
  })

  it("accepts the mutation envelope and returns the authoritative snapshot", async () => {
    getManufacturerByIdMock.mockResolvedValueOnce(manufacturerRow())
    updateManufacturerUseCaseMock.mockResolvedValueOnce(
      manufacturerRow({ companyName: "Updated Mill", updatedAt: "2026-03-20T00:00:00.000Z" }),
    )

    const response = await PATCH(
      new Request("http://localhost/api/manufacturers/11111111-1111-4111-8111-111111111111/primary/section", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Updated Mill",
          agentName: "",
          website: "",
          phone: "",
          email: "",
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
    expect(updateManufacturerUseCaseMock).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", {
      companyName: "Updated Mill",
      agentName: "",
      website: "",
      phone: "",
      email: "",
    })
    expect(payload.manufacturer.companyName).toBe("Updated Mill")
  })

  it("normalizes stale revision conflicts", async () => {
    getManufacturerByIdMock.mockResolvedValue(manufacturerRow({ updatedAt: "2026-03-21T00:00:00.000Z" }))

    const response = await PATCH(
      new Request("http://localhost/api/manufacturers/11111111-1111-4111-8111-111111111111/primary/section", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Updated Mill",
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
    expect(payload.error).toBe("Manufacturer changed before section save completed. Refresh and try again.")
  })

  it("normalizes validation failures", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/manufacturers/11111111-1111-4111-8111-111111111111/primary/section", {
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
    expect(payload.error).toBe("companyName is required")
  })
})
