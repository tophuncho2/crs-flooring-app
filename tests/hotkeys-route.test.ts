import { describe, expect, it, vi } from "vitest"

const { applyRoutePolicyMock } = vi.hoisted(() => ({
  applyRoutePolicyMock: vi.fn(),
}))

vi.mock("@/server/http/route-policy", () => ({
  applyRoutePolicy: applyRoutePolicyMock,
}))

const { GET } = await import("@/app/api/hotkeys/route")

describe("hotkeys route", () => {
  it("returns static read-only hotkey definitions", async () => {
    applyRoutePolicyMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: {
        id: "user-1",
        email: "owner@test.com",
        role: "OWNER",
        isVerified: true,
      },
    })

    const response = await GET(new Request("http://localhost/api/hotkeys"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.hotkeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "Categories",
          combination: "SHIFT + Q",
          action: "Open Categories",
        }),
      ]),
    )
    expect(payload.hotkeys[0]).not.toHaveProperty("createdAt")
    expect(payload.hotkeys[0]).not.toHaveProperty("updatedAt")
  })

  it("returns shared auth responses unchanged", async () => {
    applyRoutePolicyMock.mockResolvedValueOnce(Response.json({ error: "Unauthorized" }, { status: 401 }))

    const response = await GET(new Request("http://localhost/api/hotkeys"))
    const payload = await response.json()

    expect(response.status).toBe(401)
    expect(payload.error).toBe("Unauthorized")
  })
})
