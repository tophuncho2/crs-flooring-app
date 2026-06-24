import { beforeEach, describe, expect, it, vi } from "vitest"

const { routeJson } = await import("@/server/http/route-helpers")

const context = {
  requestId: "req-1",
  clientIp: "127.0.0.1",
  user: {
    id: "owner-1",
    email: "owner@test.com",
    rank: "TIER_1" as const,
    isVerified: true,
  },
}

describe("route-helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("adds request ids to JSON responses", async () => {
    const response = routeJson(context, { ok: true }, { status: 201 })

    expect(response.status).toBe(201)
    expect(response.headers.get("x-request-id")).toBe("req-1")
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
