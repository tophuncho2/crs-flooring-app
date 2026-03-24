import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/flooring/management-companies/route"
import { DELETE } from "@/app/api/flooring/management-companies/[id]/route"
import { validateCreateManagementCompanyInput } from "@/features/flooring/management-companies/validators"
import { validateCreatePropertyInput } from "@/features/flooring/properties/validators"

const { ensureBuilderOrAdminMock, createManagementCompanyMock, deleteManagementCompanyMock } = vi.hoisted(() => ({
  ensureBuilderOrAdminMock: vi.fn(),
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

vi.mock("@/server/auth/route-auth", () => ({
  ensureBuilderOrAdmin: ensureBuilderOrAdminMock,
}))

vi.mock("@/server/http/route-helpers", () => ({
  requireRouteAccess: vi.fn(async () => routeAccess),
  routeJson: vi.fn((_context, body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 })),
  routeError: vi.fn((_context, error) =>
    new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500 }),
  ),
}))

vi.mock("@/features/flooring/management-companies/data/mutations", async () => {
  const actual = await vi.importActual<typeof import("@/features/flooring/management-companies/data/mutations")>(
    "@/features/flooring/management-companies/data/mutations",
  )

  return {
    ...actual,
    createManagementCompany: createManagementCompanyMock,
    deleteManagementCompany: deleteManagementCompanyMock,
  }
})

vi.mock("@/features/flooring/management-companies/mutations", async () => {
  const actual = await vi.importActual<typeof import("@/features/flooring/management-companies/mutations")>(
    "@/features/flooring/management-companies/mutations",
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
    ensureBuilderOrAdminMock.mockResolvedValue(null)
  })

  it("requires company name to create a management company", async () => {
    const response = await POST(
      new Request("http://localhost/api/flooring/management-companies", {
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
      new Request("http://localhost/api/flooring/management-companies/mc-1"),
      { params: Promise.resolve({ id: "mc-1" }) },
    )

    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(deleteManagementCompanyMock).toHaveBeenCalledWith("mc-1")
  })
})
