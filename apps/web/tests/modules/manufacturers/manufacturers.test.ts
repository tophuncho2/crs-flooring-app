import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@builders/db"
import { normalizeManufacturer } from "@/modules/manufacturers/services"
import { validateManufacturerForm } from "@/modules/manufacturers/validators"
import { normalizeCatalogProduct } from "@/modules/products/services"
import { GET, POST } from "@/app/api/manufacturers/route"
import { DELETE, PATCH } from "@/app/api/manufacturers/[id]/route"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const {
  prismaMock,
  requireRouteAccessMock,
  enforceRouteRateLimitMock,
  logRouteMutationSuccessMock,
  logRouteMutationFailureMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
} = vi.hoisted(() => ({
  prismaMock: {
    flooringManufacturer: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  requireRouteAccessMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  logRouteMutationSuccessMock: vi.fn(),
  logRouteMutationFailureMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
}))

vi.mock("@builders/db", async () => {
  const actual = await vi.importActual<typeof import("@builders/db")>("@builders/db")
  return {
    ...actual,
    prisma: prismaMock,
    db: prismaMock,
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

vi.mock("@/server/http/route-helpers", () => ({
  requireRouteAccess: requireRouteAccessMock,
  enforceRouteRateLimit: enforceRouteRateLimitMock,
  routeJson: vi.fn((_context, body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 })),
  routeError: vi.fn((_context, error) => mockRouteErrorResponse(error)),
  logRouteMutationSuccess: logRouteMutationSuccessMock,
  logRouteMutationFailure: logRouteMutationFailureMock,
}))

vi.mock("@/server/http/route-policy", async () => {
  const actual = await vi.importActual<typeof import("@/server/http/route-policy")>("@/server/http/route-policy")
  return {
    ...actual,
    enforceMutationReceipt: enforceMutationReceiptMock,
    finalizeMutationReceipt: finalizeMutationReceiptMock,
  }
})

function manufacturerRecord(
  overrides: Partial<{
    id: string
    companyName: string
    agentName: string | null
    website: string | null
    phone: string | null
    email: string | null
    createdAt: Date
    updatedAt: Date
    _count: { products: number }
  }> = {},
) {
  return {
    id: "mfg-1",
    companyName: "Acme Flooring",
    agentName: null,
    website: null,
    phone: null,
    email: null,
    createdAt: new Date("2026-03-18T00:00:00Z"),
    updatedAt: new Date("2026-03-18T00:00:00Z"),
    _count: { products: 0 },
    ...overrides,
  }
}

describe("manufacturers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRouteAccessMock.mockResolvedValue(routeAccess)
    enforceRouteRateLimitMock.mockResolvedValue(null)
    enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash" })
    finalizeMutationReceiptMock.mockResolvedValue(undefined)
  })

  it("manufacturer POST route accepts missing agentName and returns normalized payload", async () => {
    prismaMock.flooringManufacturer.findFirst.mockResolvedValue(null)
    prismaMock.flooringManufacturer.create.mockResolvedValue(
      manufacturerRecord({
        companyName: "Acme Flooring",
        agentName: null,
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
        }),
      }),
    )

    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(prismaMock.flooringManufacturer.create).toHaveBeenCalledWith({
      data: {
        companyName: "Acme Flooring",
        agentName: null,
        website: null,
        phone: null,
        email: null,
      },
      include: { _count: { select: { products: true } } },
    })
    expect(payload.manufacturer).toEqual(normalizeManufacturer(manufacturerRecord()))
  })

  it("manufacturer GET route returns normalized payload", async () => {
    prismaMock.flooringManufacturer.findMany.mockResolvedValue([
      manufacturerRecord(),
      manufacturerRecord({ id: "mfg-2", companyName: "Zen Floors", _count: { products: 3 } }),
    ])

    const response = await GET(new Request("http://localhost/api/manufacturers"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.manufacturers).toEqual([
      normalizeManufacturer(manufacturerRecord()),
      normalizeManufacturer(manufacturerRecord({ id: "mfg-2", companyName: "Zen Floors", _count: { products: 3 } })),
    ])
    expect(requireRouteAccessMock).toHaveBeenCalled()
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
        }),
      }),
    )

    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("companyName is required")
    expect(prismaMock.flooringManufacturer.create).not.toHaveBeenCalled()
  })

  it("enforces case-insensitive company-name uniqueness before create", async () => {
    prismaMock.flooringManufacturer.findFirst.mockResolvedValue({ id: "mfg-2" })

    const response = await POST(
      new Request("http://localhost/api/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Acme Flooring",
          website: "",
          phone: "",
          email: "",
        }),
      }),
    )

    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Company name must be unique")
    expect(prismaMock.flooringManufacturer.create).not.toHaveBeenCalled()
  })

  it("PATCH route updates a manufacturer and returns normalized payload", async () => {
    prismaMock.flooringManufacturer.findFirst.mockResolvedValue(null)
    prismaMock.flooringManufacturer.findUniqueOrThrow
      .mockResolvedValueOnce(manufacturerRecord())
      .mockResolvedValueOnce(
        manufacturerRecord({
          companyName: "Acme Flooring",
          agentName: "Jamie Agent",
          website: "https://example.com",
          phone: "555-1111",
          email: "jamie@example.com",
        }),
      )

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
            idempotencyKey: "idem-1",
            expectedUpdatedAt: "2026-03-18T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "mfg-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(prismaMock.flooringManufacturer.update).toHaveBeenCalledWith({
      where: { id: "mfg-1" },
      data: {
        companyName: "Acme Flooring",
        agentName: "Jamie Agent",
        website: "https://example.com",
        phone: "555-1111",
        email: "jamie@example.com",
      },
    })
    expect(payload.manufacturer).toEqual(
      normalizeManufacturer(
        manufacturerRecord({
          companyName: "Acme Flooring",
          agentName: "Jamie Agent",
          website: "https://example.com",
          phone: "555-1111",
          email: "jamie@example.com",
        }),
      ),
    )
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
            idempotencyKey: "idem-2",
            expectedUpdatedAt: "2026-03-18T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "mfg-1" }) },
    )

    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("companyName is required")
    expect(prismaMock.flooringManufacturer.update).not.toHaveBeenCalled()
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
    prismaMock.flooringManufacturer.findUniqueOrThrow.mockResolvedValue(manufacturerRecord())
    prismaMock.flooringManufacturer.findUnique.mockResolvedValue({
      id: "mfg-1",
      _count: { products: 1 },
    })

    const response = await DELETE(
      new Request("http://localhost/api/manufacturers/mfg-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mutation: {
            idempotencyKey: "idem-3",
            expectedUpdatedAt: "2026-03-18T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "mfg-1" }) },
    )

    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This manufacturer has linked products and cannot be deleted")
    expect(prismaMock.flooringManufacturer.delete).not.toHaveBeenCalled()
  })

  it("deletes a manufacturer when there are no linked products", async () => {
    prismaMock.flooringManufacturer.findUniqueOrThrow.mockResolvedValue(manufacturerRecord())
    prismaMock.flooringManufacturer.findUnique.mockResolvedValue({
      id: "mfg-1",
      _count: { products: 0 },
    })
    prismaMock.flooringManufacturer.delete.mockResolvedValue({ id: "mfg-1" })

    const response = await DELETE(
      new Request("http://localhost/api/manufacturers/mfg-1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
    expect(payload).toEqual({ ok: true })
    expect(prismaMock.flooringManufacturer.delete).toHaveBeenCalledWith({ where: { id: "mfg-1" } })
  })
})
