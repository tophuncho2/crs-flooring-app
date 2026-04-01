import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/work-orders/[id]/sync-template/route"

const {
  requireRouteAccessMock,
  enforceRouteRateLimitMock,
  syncTemplateToWorkOrderUseCaseMock,
  getAppMutationReceiptMock,
  reserveAppMutationReceiptMock,
  finalizeAppMutationReceiptMock,
} = vi.hoisted(() => ({
  requireRouteAccessMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  syncTemplateToWorkOrderUseCaseMock: vi.fn(),
  getAppMutationReceiptMock: vi.fn(),
  reserveAppMutationReceiptMock: vi.fn(),
  finalizeAppMutationReceiptMock: vi.fn(),
}))

vi.mock("@builders/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@builders/db")>()
  return {
    ...actual,
    getAppMutationReceipt: getAppMutationReceiptMock,
    reserveAppMutationReceipt: reserveAppMutationReceiptMock,
    finalizeAppMutationReceipt: finalizeAppMutationReceiptMock,
  }
})

vi.mock("@/server/http/route-helpers", () => ({
  requireRouteAccess: requireRouteAccessMock,
  enforceRouteRateLimit: enforceRouteRateLimitMock,
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

vi.mock("@/modules/work-orders/application/sync-template", () => ({
  syncTemplateToWorkOrderUseCase: syncTemplateToWorkOrderUseCaseMock,
}))

describe("template sync route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireRouteAccessMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: { id: "user-1", email: "owner@test.com", role: "OWNER" },
    })
    enforceRouteRateLimitMock.mockResolvedValue(null)
    getAppMutationReceiptMock.mockResolvedValue(null)
    reserveAppMutationReceiptMock.mockResolvedValue(undefined)
    finalizeAppMutationReceiptMock.mockResolvedValue(undefined)
  })

  it("uses warehouse auth and passes validated sync input to the domain", async () => {
    syncTemplateToWorkOrderUseCaseMock.mockResolvedValue({
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
      new Request("http://localhost/api/work-orders/wo-1/sync-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: "tpl-1",
          mode: "append",
          dryRun: true,
          mutation: {
            idempotencyKey: "sync-1",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(requireRouteAccessMock).toHaveBeenCalledTimes(1)
    expect(syncTemplateToWorkOrderUseCaseMock).toHaveBeenCalledWith("wo-1", {
      templateId: "tpl-1",
      mode: "append",
      dryRun: true,
      expectedUpdatedAt: new Date("2026-03-19T00:00:00.000Z"),
    })
    expect(payload.rowsToCreate).toEqual({ materialItems: 1, serviceItems: 1 })
  })

  it("normalizes validation failures", async () => {
    const response = await POST(
      new Request("http://localhost/api/work-orders/wo-1/sync-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: "tpl-1",
          mode: "sideways",
          mutation: {
            idempotencyKey: "sync-2",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("mode must be one of overwrite, append")
    expect(syncTemplateToWorkOrderUseCaseMock).not.toHaveBeenCalled()
  })

  it("normalizes domain conflicts", async () => {
    syncTemplateToWorkOrderUseCaseMock.mockRejectedValue({
      message: "Work order changed before sync completed. Refresh and try again.",
      field: "updatedAt",
      status: 409,
    })

    const response = await POST(
      new Request("http://localhost/api/work-orders/wo-1/sync-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: "tpl-1",
          mode: "overwrite",
          mutation: {
            idempotencyKey: "sync-3",
            expectedUpdatedAt: "2026-03-19T00:00:00.000Z",
          },
        }),
      }),
      { params: Promise.resolve({ id: "wo-1" }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Work order changed before sync completed. Refresh and try again.")
  })
})
