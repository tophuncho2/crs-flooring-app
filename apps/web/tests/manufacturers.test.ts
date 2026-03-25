import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@builders/db"
import { normalizeManufacturer } from "@/features/flooring/manufacturers/services"
import { validateManufacturerForm } from "@/features/flooring/manufacturers/validators"
import { normalizeCatalogProduct } from "@/features/flooring/products/services"
import { GET, POST } from "@/app/api/flooring/manufacturers/route"
import { DELETE, PATCH } from "@/app/api/flooring/manufacturers/[id]/route"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const {
  createManufacturerMock,
  updateManufacturerMock,
  deleteManufacturerMock,
  listManufacturersMock,
  requireRouteAccessMock,
  enforceRouteRateLimitMock,
  logRouteMutationSuccessMock,
  logRouteMutationFailureMock,
} = vi.hoisted(() => ({
  createManufacturerMock: vi.fn(),
  updateManufacturerMock: vi.fn(),
  deleteManufacturerMock: vi.fn(),
  listManufacturersMock: vi.fn(),
  requireRouteAccessMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  logRouteMutationSuccessMock: vi.fn(),
  logRouteMutationFailureMock: vi.fn(),
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
  logRouteMutationSuccess: logRouteMutationSuccessMock,
  logRouteMutationFailure: logRouteMutationFailureMock,
}))

vi.mock("@/features/flooring/manufacturers/mutations", () => ({
  createManufacturer: createManufacturerMock,
  updateManufacturer: updateManufacturerMock,
  deleteManufacturer: deleteManufacturerMock,
}))

vi.mock("@/features/flooring/manufacturers/queries", () => ({
  listManufacturers: listManufacturersMock,
}))

function manufacturerRecord(overrides: Partial<{
  id: string
  companyName: string
  agentName: string | null
  website: string | null
  phone: string | null
  email: string | null
  createdAt: Date
  updatedAt: Date
  _count: { products: number }
}> = {}) {
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
  })

  it("manufacturer POST route accepts missing agentName and returns normalized payload", async () => {
    const normalizedManufacturer = normalizeManufacturer(
      manufacturerRecord({
        companyName: "Acme Flooring",
        agentName: null,
      }),
    )
    createManufacturerMock.mockResolvedValue(normalizedManufacturer)

    const response = await POST(
      new Request("http://localhost/api/flooring/manufacturers", {
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
    expect(createManufacturerMock).toHaveBeenCalledWith({
      companyName: "Acme Flooring",
      agentName: null,
      website: null,
      phone: null,
      email: null,
    })
    expect(payload.manufacturer).toEqual(normalizedManufacturer)
  })

  it("manufacturer GET route returns normalized payload", async () => {
    const normalizedManufacturers = [
      manufacturerRecord(),
      manufacturerRecord({ id: "mfg-2", companyName: "Zen Floors", _count: { products: 3 } }),
    ].map(normalizeManufacturer)
    listManufacturersMock.mockResolvedValue(normalizedManufacturers)

    const response = await GET(new Request("http://localhost/api/flooring/manufacturers"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.manufacturers).toEqual(normalizedManufacturers)
    expect(requireRouteAccessMock).toHaveBeenCalled()
  })

  it("requires company name when creating a manufacturer", async () => {
    const response = await POST(
      new Request("http://localhost/api/flooring/manufacturers", {
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
    expect(createManufacturerMock).not.toHaveBeenCalled()
  })

  it("returns a company-name specific message when the company name is not unique", async () => {
    createManufacturerMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`companyName`)", {
        code: "P2002",
        clientVersion: "5.22.0",
        meta: { target: ["companyName"] },
      }),
    )

    const response = await POST(
      new Request("http://localhost/api/flooring/manufacturers", {
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
    expect(payload.error).toBe("Company Name must be unique")
  })

  it("PATCH route updates a manufacturer and returns normalized payload", async () => {
    const normalizedManufacturer = normalizeManufacturer(
      manufacturerRecord({
        companyName: "Acme Flooring",
        agentName: "Jamie Agent",
        website: "https://example.com",
        phone: "555-1111",
        email: "jamie@example.com",
      }),
    )
    updateManufacturerMock.mockResolvedValue(normalizedManufacturer)

    const response = await PATCH(
      new Request("http://localhost/api/flooring/manufacturers/mfg-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "Acme Flooring",
          agentName: "Jamie Agent",
          website: "https://example.com",
          phone: "555-1111",
          email: "jamie@example.com",
        }),
      }),
      { params: Promise.resolve({ id: "mfg-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(updateManufacturerMock).toHaveBeenCalledWith("mfg-1", {
      companyName: "Acme Flooring",
      agentName: "Jamie Agent",
      website: "https://example.com",
      phone: "555-1111",
      email: "jamie@example.com",
    })
    expect(payload.manufacturer).toEqual(normalizedManufacturer)
  })

  it("PATCH requires companyName", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/flooring/manufacturers/mfg-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: "   ",
          agentName: "Jamie Agent",
        }),
      }),
      { params: Promise.resolve({ id: "mfg-1" }) },
    )

    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("companyName is required")
    expect(updateManufacturerMock).not.toHaveBeenCalled()
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
    deleteManufacturerMock.mockRejectedValue({
      kind: "app",
      message: "This manufacturer has linked products and cannot be deleted",
      status: 409,
    })

    const response = await DELETE(new Request("http://localhost/api/flooring/manufacturers/mfg-1"), {
      params: Promise.resolve({ id: "mfg-1" }),
    })

    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("This manufacturer has linked products and cannot be deleted")
    expect(deleteManufacturerMock).toHaveBeenCalledWith("mfg-1")
  })

  it("deletes a manufacturer when there are no linked products", async () => {
    deleteManufacturerMock.mockResolvedValue({ ok: true })

    const response = await DELETE(new Request("http://localhost/api/flooring/manufacturers/mfg-1"), {
      params: Promise.resolve({ id: "mfg-1" }),
    })

    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true })
    expect(deleteManufacturerMock).toHaveBeenCalledWith("mfg-1")
  })
})
