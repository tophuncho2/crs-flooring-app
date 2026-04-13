import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@builders/db"
import { validateManufacturerForm } from "@builders/domain"
import { normalizeCatalogProduct } from "@/modules/products/services"
import { GET, POST } from "@/app/api/manufacturers/route"
import { DELETE, PATCH } from "@/app/api/manufacturers/[id]/route"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const {
  applyRoutePolicyMock,
  enforceQueryRateLimitMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  listManufacturersMock,
  getManufacturerByIdMock,
  createManufacturerUseCaseMock,
  updateManufacturerUseCaseMock,
  deleteManufacturerUseCaseMock,
  withMutationTelemetryMock,
} = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
  enforceQueryRateLimitMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  listManufacturersMock: vi.fn(),
  getManufacturerByIdMock: vi.fn(),
  createManufacturerUseCaseMock: vi.fn(),
  updateManufacturerUseCaseMock: vi.fn(),
  deleteManufacturerUseCaseMock: vi.fn(),
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
    updateManufacturerUseCase: updateManufacturerUseCaseMock,
    deleteManufacturerUseCase: deleteManufacturerUseCaseMock,
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
}))

vi.mock("@/modules/shared/engines/common/application/mutation-telemetry", () => ({
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

    const response = await GET(new Request("http://localhost/api/manufacturers"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.manufacturers).toEqual(rows)
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

  it("PATCH route updates a manufacturer and returns normalized payload", async () => {
    const snapshot = normalizedManufacturerRow()
    const updated = normalizedManufacturerRow({
      companyName: "Acme Flooring",
      agentName: "Jamie Agent",
      website: "https://example.com",
      phone: "555-1111",
      email: "jamie@example.com",
    })
    getManufacturerByIdMock
      .mockResolvedValueOnce(snapshot)
    updateManufacturerUseCaseMock.mockResolvedValue(updated)

    const response = await PATCH(
      new Request("http://localhost/api/manufacturers/mfg-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Acme Flooring",
          agentName: "Jamie Agent",
          website: "https://example.com",
          phone: "555-1111",
          email: "jamie@example.com",
          mutation: {
            idempotencyKey: "idem-4",
            expectedUpdatedAt: "2026-03-18T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "mfg-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(updateManufacturerUseCaseMock).toHaveBeenCalledWith("mfg-1", {
      companyName: "Acme Flooring",
      agentName: "Jamie Agent",
      website: "https://example.com",
      phone: "555-1111",
      email: "jamie@example.com",
    })
    expect(payload.manufacturer).toEqual(updated)
  })

  it("PATCH requires companyName", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/manufacturers/mfg-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "   ",
          agentName: "Jamie Agent",
          mutation: {
            idempotencyKey: "idem-5",
            expectedUpdatedAt: "2026-03-18T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "mfg-1" }) },
    )

    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("companyName is required")
    expect(updateManufacturerUseCaseMock).not.toHaveBeenCalled()
  })

  it("validates company name presence and uniqueness in the manufacturer form", () => {
    expect(validateManufacturerForm({ companyName: "" })).toBe("Company name is required")
    expect(
      validateManufacturerForm(
        { companyName: "Acme Flooring" },
        [
          { id: "mfg-1", companyName: "Acme Flooring" },
          { id: "mfg-2", companyName: "Other Mill" },
        ],
      ),
    ).toBe("Company name must be unique")
    expect(
      validateManufacturerForm(
        { companyName: "Acme Flooring" },
        [{ id: "mfg-1", companyName: "Acme Flooring" }],
        "mfg-1",
      ),
    ).toBe("")
  })

  it("products resolve manufacturer display names from company name", () => {
    const normalized = normalizeCatalogProduct({
      id: "prod-1",
      name: "Acme Flooring - Plush - Sand",
      categoryId: "cat-1",
      manufacturerId: "mfg-1",
      manufacturerName: "stale manufacturer name",
      style: "Plush",
      color: "Sand",
      width: null,
      sheetSize: null,
      thickness: null,
      unitWeight: null,
      baseColor: null,
      coveragePerUnit: new Prisma.Decimal("12.5"),
      photoUrls: [],
      notes: null,
      createdAt: new Date("2026-03-18T00:00:00Z"),
      updatedAt: new Date("2026-03-18T00:00:00Z"),
      category: {
        id: "cat-1",
        name: "Carpet",
        sendUnit: { id: "u1", name: "SY" },
        stockUnit: { id: "u2", name: "Roll" },
        coverageAvailableUnit: null,
        itemCoverageUnit: { id: "u3", name: "SF" },
        serviceUnit: null,
      },
      manufacturer: {
        id: "mfg-1",
        companyName: "Acme Flooring",
        agentName: "Jamie Agent",
        website: null,
      },
    })

    expect(normalized.manufacturerName).toBe("Acme Flooring")
  })

  it("prevents deleting a manufacturer that still has linked products", async () => {
    const snapshot = normalizedManufacturerRow()
    getManufacturerByIdMock.mockResolvedValue(snapshot)
    deleteManufacturerUseCaseMock.mockRejectedValue(
      Object.assign(new Error("This manufacturer has linked products and cannot be deleted"), {
        code: "MANUFACTURER_IN_USE",
        status: 409,
      }),
    )

    const response = await DELETE(
      new Request("http://localhost/api/manufacturers/mfg-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "idem-6",
            expectedUpdatedAt: "2026-03-18T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "mfg-1" }) },
    )

    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This manufacturer has linked products and cannot be deleted")
    expect(deleteManufacturerUseCaseMock).toHaveBeenCalledWith("mfg-1")
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
      { params: Promise.resolve({ id: "mfg-1" }) },
    )

    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true })
    expect(deleteManufacturerUseCaseMock).toHaveBeenCalledWith("mfg-1")
  })
})
