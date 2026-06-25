import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "@/app/api/unit-of-measures/route"

const { listUnitOfMeasuresUseCaseMock, applyRoutePolicyMock } = vi.hoisted(() => ({
  listUnitOfMeasuresUseCaseMock: vi.fn(),
  applyRoutePolicyMock: vi.fn(),
}))

vi.mock("@builders/application", async () => {
  const actual = await vi.importActual<typeof import("@builders/application")>("@builders/application")
  return {
    ...actual,
    listUnitOfMeasuresUseCase: listUnitOfMeasuresUseCaseMock,
  }
})

vi.mock("@/server/http/route-policy", async () => {
  const actual = await vi.importActual<typeof import("@/server/http/route-policy")>("@/server/http/route-policy")
  return {
    ...actual,
    applyRoutePolicy: applyRoutePolicyMock,
  }
})

vi.mock("@/server/platform/logger", () => ({
  logEvent: vi.fn(),
}))

describe("unit-of-measures routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    applyRoutePolicyMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: {
        id: "admin-1",
        email: "admin@test.com",
        rank: "DEVELOPER",
        isVerified: true,
      },
    })
  })

  it("GET returns the paginated list output", async () => {
    listUnitOfMeasuresUseCaseMock.mockResolvedValue({
      rows: [
        { id: "u-1", name: "Square Feet", abbreviation: "sqft", createdAt: "2026-03-19T00:00:00.000Z" },
        { id: "u-2", name: "Hour", abbreviation: "hr", createdAt: "2026-03-19T00:00:00.000Z" },
      ],
      total: 2,
    })

    const response = await GET(new Request("http://localhost/api/unit-of-measures?page=1&pageSize=50"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.total).toBe(2)
    expect(payload.rows).toHaveLength(2)
    expect(payload.rows[0]).toMatchObject({ id: "u-1", name: "Square Feet" })
    expect(listUnitOfMeasuresUseCaseMock).toHaveBeenCalledWith({
      filters: {},
      page: 1,
      pageSize: 50,
    })
    expect(applyRoutePolicyMock).toHaveBeenCalled()
  })

  it("returns shared auth responses unchanged", async () => {
    applyRoutePolicyMock.mockResolvedValueOnce(Response.json({ error: "Forbidden" }, { status: 403 }))

    const response = await GET(new Request("http://localhost/api/unit-of-measures"))
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload.error).toBe("Forbidden")
  })
})
