import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/flooring/work-orders/[id]/sync-template/route"

const { ensureBuilderOrAdminMock, syncTemplateToWorkOrderMock } = vi.hoisted(() => ({
  ensureBuilderOrAdminMock: vi.fn(),
  syncTemplateToWorkOrderMock: vi.fn(),
}))

vi.mock("@/server/auth/route-auth", () => ({
  ensureBuilderOrAdmin: ensureBuilderOrAdminMock,
}))

vi.mock("@/features/flooring/work-orders/domain/syncTemplate", () => ({
  syncTemplateToWorkOrder: syncTemplateToWorkOrderMock,
}))

describe("template sync route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureBuilderOrAdminMock.mockResolvedValue(null)
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
    expect(ensureBuilderOrAdminMock).toHaveBeenCalledWith({ toolSlug: "warehouse" })
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
