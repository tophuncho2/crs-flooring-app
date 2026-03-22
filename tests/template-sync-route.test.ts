import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/flooring/work-orders/[id]/sync-template/route"

const {
  authorizeWorkOrdersRouteMock,
  enforceRouteRateLimitMock,
  logRouteMutationSuccessMock,
  logRouteMutationFailureMock,
  syncTemplateToWorkOrderMock,
} = vi.hoisted(() => ({
  authorizeWorkOrdersRouteMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  logRouteMutationSuccessMock: vi.fn(),
  logRouteMutationFailureMock: vi.fn(),
  syncTemplateToWorkOrderMock: vi.fn(),
}))

vi.mock("@/features/flooring/shared/access/templates-work-orders", () => ({
  authorizeWorkOrdersRoute: authorizeWorkOrdersRouteMock,
}))

vi.mock("@/server/http/route-helpers", () => ({
  enforceRouteRateLimit: enforceRouteRateLimitMock,
  logRouteMutationSuccess: logRouteMutationSuccessMock,
  logRouteMutationFailure: logRouteMutationFailureMock,
  routeJson: (_access: unknown, body: unknown, init?: ResponseInit) => Response.json(body, init),
  routeError: (_access: unknown, error: unknown) => {
    const maybeError = error as { message?: unknown; status?: unknown; field?: unknown; kind?: unknown }
    const payload: Record<string, unknown> = {
      error: typeof maybeError.message === "string" ? maybeError.message : "Unexpected server error",
    }

    if (typeof maybeError.field === "string") {
      payload.field = maybeError.field
    }

    return Response.json(payload, {
      status:
        typeof maybeError.status === "number"
          ? maybeError.status
          : maybeError.kind === "app" || typeof maybeError.field === "string"
            ? 400
            : 500,
    })
  },
}))

vi.mock("@/features/flooring/work-orders/domain/syncTemplate", () => ({
  syncTemplateToWorkOrder: syncTemplateToWorkOrderMock,
}))

describe("template sync route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeWorkOrdersRouteMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: { id: "user-1", email: "owner@test.com" },
    })
    enforceRouteRateLimitMock.mockResolvedValue(null)
  })

  it("uses warehouse auth and passes validated sync input to the domain", async () => {
    syncTemplateToWorkOrderMock.mockResolvedValue({
      mode: "overwrite",
      dryRun: true,
      policy: { rowBehavior: {} },
      workOrder: null,
      headerUpdates: { warehouseId: true, instructions: true, templateId: true },
      rowsToCreate: { materialItems: 1, serviceItems: 1 },
      rowsToDelete: { materialItems: 0, serviceItems: 0 },
      counts: { materialItems: 1, serviceItems: 1 },
    })

    const response = await POST(
      new Request("http://localhost/api/flooring/work-orders/wo-1/sync-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: "tpl-1",
          mode: "append",
          dryRun: true,
          expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
        }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(authorizeWorkOrdersRouteMock).toHaveBeenCalledTimes(1)
    expect(syncTemplateToWorkOrderMock).toHaveBeenCalledWith("wo-1", {
      templateId: "tpl-1",
      mode: "append",
      dryRun: true,
      expectedUpdatedAt: new Date("2026-03-19T00:00:00.000Z"),
    })
    expect(payload.rowsToCreate).toEqual({ materialItems: 1, serviceItems: 1 })
  })

  it("normalizes validation failures", async () => {
    const response = await POST(
      new Request("http://localhost/api/flooring/work-orders/wo-1/sync-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: "tpl-1",
          mode: "sideways",
        }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("mode must be one of overwrite, append")
    expect(syncTemplateToWorkOrderMock).not.toHaveBeenCalled()
  })

  it("normalizes domain conflicts", async () => {
    syncTemplateToWorkOrderMock.mockRejectedValue({
      message: "Work order changed before sync completed. Refresh and try again.",
      field: "updatedAt",
      status: 409,
    })

    const response = await POST(
      new Request("http://localhost/api/flooring/work-orders/wo-1/sync-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: "tpl-1",
          mode: "overwrite",
        }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Work order changed before sync completed. Refresh and try again.")
  })
})
