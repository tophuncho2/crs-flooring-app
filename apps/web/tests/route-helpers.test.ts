import { beforeEach, describe, expect, it, vi } from "vitest"

const { logEventMock } = vi.hoisted(() => ({
  logEventMock: vi.fn(),
}))

vi.mock("@/server/platform/logger", () => ({
  logEvent: logEventMock,
}))

const {
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeJson,
} = await import("@/server/http/route-helpers")

const context = {
  requestId: "req-1",
  clientIp: "127.0.0.1",
  user: {
    id: "owner-1",
    email: "owner@test.com",
    role: "OWNER" as const,
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

  it("logs mutation success and failure with route context", () => {
    logRouteMutationSuccess(context, {
      message: "Created record",
      action: "records.create",
      route: "/api/test",
      entityType: "record",
      entityId: "rec-1",
    })

    logRouteMutationFailure(
      context,
      {
        message: "Record creation failed",
        action: "records.create.error",
        route: "/api/test",
        entityType: "record",
      },
      new Error("boom"),
    )

    expect(logEventMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        message: "Created record",
        requestId: "req-1",
        userId: "owner-1",
      }),
    )
    expect(logEventMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        level: "error",
        message: "Record creation failed",
        requestId: "req-1",
        userEmail: "owner@test.com",
      }),
    )
  })
})
