import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/flooring/properties/route"
import { validateCreatePropertyInput } from "@/features/flooring/properties/validators"
import { normalizeProperty } from "@/features/flooring/properties/services"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const { requireRouteAccessMock, enforceRouteRateLimitMock, createPropertyMock } = vi.hoisted(() => ({
  requireRouteAccessMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  createPropertyMock: vi.fn(),
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

vi.mock("@/features/flooring/properties/mutations", async () => {
  const actual = await vi.importActual<typeof import("@/features/flooring/properties/mutations")>(
    "@/features/flooring/properties/mutations",
  )

  return {
    ...actual,
    createProperty: createPropertyMock,
  }
})

function propertyRecord(overrides: Partial<{
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  managementCompany: { id: string; name: string } | null
  templates: Array<{
    id: string
    templateTag: string
    warehouseName: string
    itemsCount: number
  }>
}> = {}) {
  return {
    id: "prop-1",
    name: "Oak Apartments",
    streetAddress: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    fullAddress: "",
    managementCompany: null,
    templates: [],
    ...overrides,
  }
}

describe("properties", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRouteAccessMock.mockResolvedValue(routeAccess)
    enforceRouteRateLimitMock.mockResolvedValue(null)
  })

  it("requires property name and no other property field", async () => {
    const response = await POST(
      new Request("http://localhost/api/flooring/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managementCompanyId: null,
          streetAddress: "1 Main St",
        }),
      }),
    )

    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required")
    expect(createPropertyMock).not.toHaveBeenCalled()
  })

  it("allows creating a property with only name and no management company", async () => {
    createPropertyMock.mockResolvedValue(propertyRecord({ name: "Oak Apartments" }))

    const response = await POST(
      new Request("http://localhost/api/flooring/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Oak Apartments",
          managementCompanyId: null,
        }),
      }),
    )

    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(createPropertyMock).toHaveBeenCalledWith({
      managementCompanyId: null,
      name: "Oak Apartments",
      streetAddress: null,
      city: null,
      state: null,
      postalCode: null,
      phone: null,
      email: null,
    })
    expect(payload.property).toEqual(propertyRecord({ name: "Oak Apartments" }))
  })

  it("shares the 2-letter state constraint on property create input", () => {
    const valid = validateCreatePropertyInput({
      name: "Oak Apartments",
      managementCompanyId: null,
      state: "va",
    })

    expect(valid.state).toBe("VA")

    expect(() =>
      validateCreatePropertyInput({
        name: "Oak Apartments",
        managementCompanyId: null,
        state: "virginia",
      }),
    ).toThrowError("state must be a 2-letter state abbreviation")
  })

  it("keeps each property linked to at most one management company", () => {
    const normalized = normalizeProperty({
      id: "prop-1",
      name: "Oak Apartments",
      streetAddress: null,
      city: null,
      state: null,
      postalCode: null,
      phone: null,
      email: null,
      managementCompany: { id: "mc-1", name: "Acme Management" },
      templates: [],
    })

    expect(normalized.managementCompany).toEqual({
      id: "mc-1",
      name: "Acme Management",
    })
    expect(Array.isArray(normalized.managementCompany)).toBe(false)
  })
})
