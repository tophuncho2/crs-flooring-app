import { describe, expect, it, vi } from "vitest"

const { ensureAuthenticatedMock } = vi.hoisted(() => ({
  ensureAuthenticatedMock: vi.fn(),
}))

vi.mock("@/server/auth/route-auth", () => ({
  ensureAuthenticated: ensureAuthenticatedMock,
}))

const { GET } = await import("@/app/api/hotkeys/route")

describe("hotkeys route", () => {
  it("returns static read-only hotkey definitions", async () => {
    ensureAuthenticatedMock.mockResolvedValue(null)

    const response = await GET()
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
})
