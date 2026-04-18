import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "@/app/api/unit-of-measures/route"

const { listUnitOfMeasuresMock, applyRoutePolicyMock } = vi.hoisted(() => ({
  listUnitOfMeasuresMock: vi.fn(),
  applyRoutePolicyMock: vi.fn(),
}))

vi.mock("@builders/db", async () => {
  const actual = await vi.importActual<typeof import("@builders/db")>("@builders/db")
  return {
    ...actual,
    listUnitOfMeasures: listUnitOfMeasuresMock,
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
        role: "ADMIN",
        isVerified: true,
      },
    })
  })

  it("GET returns normalized rows", async () => {
    listUnitOfMeasuresMock.mockResolvedValue([
      { id: "u-1", name: "Square Feet", createdAt: "2026-03-19T00:00:00.000Z", updatedAt: "2026-03-19T00:00:00.000Z" },
      { id: "u-2", name: "Hour", createdAt: "2026-03-19T00:00:00.000Z", updatedAt: "2026-03-19T00:00:00.000Z" },
    ])

    const response = await GET(new Request("http://localhost/api/unit-of-measures"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.unitOfMeasures).toEqual([
      { id: "u-1", name: "Square Feet", createdAt: "2026-03-19T00:00:00.000Z", updatedAt: "2026-03-19T00:00:00.000Z" },
      { id: "u-2", name: "Hour", createdAt: "2026-03-19T00:00:00.000Z", updatedAt: "2026-03-19T00:00:00.000Z" },
    ])
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
