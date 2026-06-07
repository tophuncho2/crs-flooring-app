import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET, POST } from "@/app/api/manufacturers/route"
import { DELETE } from "@/app/api/manufacturers/[id]/route"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const {
  applyRoutePolicyMock,
  enforceQueryRateLimitMock,
  parseMutationEnvelopeMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  listManufacturersMock,
  getManufacturerByIdMock,
  createManufacturerUseCaseMock,
  deleteManufacturerUseCaseMock,
  listManufacturersUseCaseMock,
  withMutationTelemetryMock,
} = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  enforceQueryRateLimitMock: vi.fn(),
  parseMutationEnvelopeMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  listManufacturersMock: vi.fn(),
  getManufacturerByIdMock: vi.fn(),
  createManufacturerUseCaseMock: vi.fn(),
  deleteManufacturerUseCaseMock: vi.fn(),
  listManufacturersUseCaseMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
}))

vi.mock("@builders/db", async () => {
  const actual = await vi.importActual<typeof import("@builders/db")>("@builders/db")
  return {
    ...actual,
    listManufacturers: listManufacturersMock,
    getManufacturerById: getManufacturerByIdMock,
  }
})

vi.mock("@builders/application", async () => {
  const actual = await vi.importActual<typeof import("@builders/application")>("@builders/application")
  return {
    ...actual,
    createManufacturerUseCase: createManufacturerUseCaseMock,
    deleteManufacturerUseCase: deleteManufacturerUseCaseMock,
    listManufacturersUseCase: listManufacturersUseCaseMock,
  }
})

vi.mock("@/app/api/manufacturers/_validators", () => ({
  validateManufacturerInput: vi.fn((body: Record<string, unknown>) => {
    const companyName = typeof body.companyName === "string" ? body.companyName.trim() : ""
    if (!companyName) {
      throw { kind: "app", message: "companyName is required", field: "companyName", status: 400 }
    }
    return body
  }),
  validateListManufacturersQuery: vi.fn(() => ({ filters: {}, page: 1, pageSize: 20 })),
}))

vi.mock("@/server/telemetry/mutation-telemetry", () => ({
  withMutationTelemetry: withMutationTelemetryMock,
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
  routeJson: vi.fn((_context, body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 })),
  routeError: vi.fn((_context, error) => mockRouteErrorResponse(error)),
}))

vi.mock("@/server/http/route-policy", async () => {
  const actual = await vi.importActual<typeof import("@/server/http/route-policy")>("@/server/http/route-policy")
  return {
    ...actual,
    applyRoutePolicy: applyRoutePolicyMock,
    enforceQueryRateLimit: enforceQueryRateLimitMock,
    parseMutationEnvelope: parseMutationEnvelopeMock,
    enforceMutationReceipt: enforceMutationReceiptMock,
    finalizeMutationReceipt: finalizeMutationReceiptMock,
  }
})

function normalizedManufacturerRow(
  overrides: Partial<{
    id: string
    companyName: string
    agentName: string
    website: string
    phone: string
    email: string
    productsCount: number
    createdAt: string
    updatedAt: string
  }> = {},
) {
  return {
    id: "mfg-1",
    companyName: "Acme Flooring",
    agentName: "",
    website: "",
    phone: "",
    email: "",
    productsCount: 0,
    createdAt: "2026-03-18T00:00:00.000Z",
    updatedAt: "2026-03-18T00:00:00.000Z",
    ...overrides,
  }
}

describe("manufacturers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    applyRoutePolicyMock.mockResolvedValue(routeAccess)
    enforceQueryRateLimitMock.mockResolvedValue(null)
    parseMutationEnvelopeMock.mockImplementation((body: Record<string, unknown>, parse: (b: unknown) => unknown) => {
      const { mutation, ...rest } = body
      return {
        input: parse(rest),
        mutation: mutation ?? { idempotencyKey: "test-key" },
      }
    })
    enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash" })
    finalizeMutationReceiptMock.mockResolvedValue(undefined)
    withMutationTelemetryMock.mockImplementation(async (_access, _meta, callback) => callback())
  })

  it("manufacturer POST route accepts missing agentName and returns normalized payload", async () => {
    const created = normalizedManufacturerRow()
    createManufacturerUseCaseMock.mockResolvedValue(created)

    const response = await POST(
      new Request("http://localhost/api/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Acme Flooring",
          website: "",
          phone: "",
          email: "",
          mutation: { idempotencyKey: "idem-1" },
        }),
      }),
    )

    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(createManufacturerUseCaseMock).toHaveBeenCalledWith({
      companyName: "Acme Flooring",
      website: "",
      phone: "",
      email: "",
    })
    expect(payload.manufacturer).toEqual(created)
  })

  it("manufacturer GET route returns normalized payload", async () => {
    const rows = [
      normalizedManufacturerRow(),
      normalizedManufacturerRow({ id: "mfg-2", companyName: "Zen Floors", productsCount: 3 }),
    ]
    listManufacturersMock.mockResolvedValue(rows)
    listManufacturersUseCaseMock.mockResolvedValue({ rows, total: rows.length })

    const response = await GET(new Request("http://localhost/api/manufacturers"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.rows).toEqual(rows)
    expect(payload.total).toBe(rows.length)
    expect(applyRoutePolicyMock).toHaveBeenCalled()
  })

  it("requires company name when creating a manufacturer", async () => {
    const response = await POST(
      new Request("http://localhost/api/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "   ",
          website: "",
          phone: "",
          email: "",
          mutation: { idempotencyKey: "idem-2" },
        }),
      }),
    )

    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("companyName is required")
    expect(createManufacturerUseCaseMock).not.toHaveBeenCalled()
  })

  it("enforces case-insensitive company-name uniqueness before create", async () => {
    createManufacturerUseCaseMock.mockRejectedValue(
      Object.assign(new Error("Company name must be unique"), {
        code: "MANUFACTURER_NAME_CONFLICT",
        status: 409,
        field: "companyName",
      }),
    )

    const response = await POST(
      new Request("http://localhost/api/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Acme Flooring",
          website: "",
          phone: "",
          email: "",
          mutation: { idempotencyKey: "idem-3" },
        }),
      }),
    )

    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Company name must be unique")
    expect(createManufacturerUseCaseMock).toHaveBeenCalled()
  })

  it("deletes a manufacturer when there are no linked products", async () => {
    const snapshot = normalizedManufacturerRow()
    getManufacturerByIdMock.mockResolvedValue(snapshot)
    deleteManufacturerUseCaseMock.mockResolvedValue({ ok: true })

    const response = await DELETE(
      new Request("http://localhost/api/manufacturers/mfg-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "idem-7",
            expectedUpdatedAt: "2026-03-18T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) },
    )

    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true })
    expect(deleteManufacturerUseCaseMock).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111")
  })
})
