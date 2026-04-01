import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/management-companies/route"
import { DELETE } from "@/app/api/management-companies/[id]/route"
import { validateCreateManagementCompanyInput } from "@/modules/management-companies/validators"
import { validateCreatePropertyInput } from "@/modules/properties/validators"
import { mockRouteErrorResponse } from "@/tests/helpers/route-error"

const { createManagementCompanyMock, deleteManagementCompanyMock } = vi.hoisted(() => ({
  createManagementCompanyMock: vi.fn(),
  deleteManagementCompanyMock: vi.fn(),
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
  clientIp: null,
} as const

vi.mock("@/server/http/route-helpers", () => ({
  requireRouteAccess: vi.fn(async () => routeAccess),
  enforceRouteRateLimit: vi.fn(async () => null),
  routeJson: vi.fn((_context, body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 })),
  routeError: vi.fn((_context, error) => mockRouteErrorResponse(error)),
}))

vi.mock("@/modules/management-companies/data/mutations", async () => {
  const actual = await vi.importActual<typeof import("@/modules/management-companies/data/mutations")>(
    "@/modules/management-companies/data/mutations",
  )

  return {
    ...actual,
    createManagementCompany: createManagementCompanyMock,
    deleteManagementCompany: deleteManagementCompanyMock,
  }
})

vi.mock("@/modules/management-companies/mutations", async () => {
  const actual = await vi.importActual<typeof import("@/modules/management-companies/mutations")>(
    "@/modules/management-companies/mutations",
  )

  return {
    ...actual,
    createManagementCompany: createManagementCompanyMock,
    deleteManagementCompany: deleteManagementCompanyMock,
  }
})

describe("management companies", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires company name to create a management company", async () => {
    const response = await POST(
      new Request("http://localhost/api/management-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streetAddress: "1 Main St",
        }),
      }),
    )

    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("name is required")
    expect(createManagementCompanyMock).not.toHaveBeenCalled()
  })

  it("normalizes a valid 2-letter management company state abbreviation", () => {
    const input = validateCreateManagementCompanyInput({
      name: "Acme Management",
      state: "nc",
    })

    expect(input.state).toBe("NC")
  })

  it("shares the same 2-letter state rule with properties", () => {
    const input = validateCreatePropertyInput({
      name: "Oak Apartments",
      managementCompanyId: null,
      state: "sc",
    })

    expect(input.state).toBe("SC")
    expect(input.managementCompanyId).toBeNull()
  })

  it("rejects long state names for management companies and properties", () => {
    expect(() =>
      validateCreateManagementCompanyInput({
        name: "Acme Management",
        state: "north carolina",
      }),
    ).toThrowError("state must be a 2-letter state abbreviation")

    expect(() =>
      validateCreatePropertyInput({
        name: "Oak Apartments",
        managementCompanyId: null,
        state: "south carolina",
      }),
    ).toThrowError("state must be a 2-letter state abbreviation")
  })

  it("allows deleting a management company even when properties are linked", async () => {
    deleteManagementCompanyMock.mockResolvedValue(undefined)

    const response = await DELETE(
      new Request("http://localhost/api/management-companies/mc-1"),
      { params: Promise.resolve({ id: "mc-1" }) },
    )

    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(deleteManagementCompanyMock).toHaveBeenCalledWith("mc-1")
  })
})
