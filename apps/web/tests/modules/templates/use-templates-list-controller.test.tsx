// @vitest-environment jsdom

/**
 * Guards the templates LIST-row "Sync to Work Order" action. There are two sync
 * entry points (list row + record hub); both must land on the new work order's
 * Requested Material view via `?view=requested`. This pins the list path, which
 * was the one that regressed (opened on Adjustments).
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { navigationMocks } from "../../helpers/next-navigation-mock"

const { syncTemplateToWorkOrderRequestMock } = vi.hoisted(() => ({
  syncTemplateToWorkOrderRequestMock: vi.fn(),
}))
vi.mock("@/modules/templates/data/mutations", async () => {
  const actual = await vi.importActual<typeof import("@/modules/templates/data/mutations")>(
    "@/modules/templates/data/mutations",
  )
  return { ...actual, syncTemplateToWorkOrderRequest: syncTemplateToWorkOrderRequestMock }
})

import { useTemplatesListController } from "@/modules/templates/controllers/list/use-templates-list-controller"

describe("useTemplatesListController — sync to work order", () => {
  afterEach(() => {
    syncTemplateToWorkOrderRequestMock.mockReset()
  })

  it("navigates to the new work order's Requested Material view, carrying returnTo back to the list", async () => {
    syncTemplateToWorkOrderRequestMock.mockResolvedValue({ workOrder: { id: "wo-9" } })
    const { result } = renderHook(() => useTemplatesListController())

    await act(async () => {
      await result.current.syncTemplate("tpl-1")
    })

    // `returnTo` is the current page (mocked `usePathname` → "/dashboard/test") so the
    // WO record's Back button lands back where the sync launched from, not the WO list.
    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/work-orders/wo-9?view=requested&returnTo=%2Fdashboard%2Ftest",
    )
  })
})
