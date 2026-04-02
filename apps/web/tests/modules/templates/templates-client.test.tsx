// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  requestJsonMock,
  resetSimpleTableClientMocks,
} from "../../helpers/simple-table-client-mocks"
import { navigationMocks } from "../../helpers/next-navigation-mock"
import TemplatesClient from "@/modules/templates/components/templates-client"

vi.mock("@/modules/shared/engines/list-view/controllers/use-server-table-query-controls", () => ({
  useServerTableQueryControls: ({
    setSearchQuery,
    setIsAscendingSort,
    isAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
  }: {
    setSearchQuery: (value: string) => void
    setIsAscendingSort: (value: boolean) => void
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    setIsGroupingEnabled: (value: boolean) => void
    groupByKeys: string[]
    setGroupByKeys: (value: string[]) => void
  }) => ({
    onSearchQueryChange: setSearchQuery,
    onToggleSort: () => setIsAscendingSort(!isAscendingSort),
    onToggleGrouping: () => setIsGroupingEnabled(!isGroupingEnabled),
    onGroupByKeyAtIndexChange: (index: number, nextKey: string) => {
      const next = [...groupByKeys]
      next[index] = nextKey
      setGroupByKeys(next)
    },
    onAddGroupBy: () => setGroupByKeys([...groupByKeys, ""]),
    onRemoveGroupBy: (index: number) => setGroupByKeys(groupByKeys.filter((_, currentIndex) => currentIndex !== index)),
  }),
}))

vi.mock("@/modules/shared/engines/record-view/sections/metrics/record-line-summary", () => ({
  RecordLineSummary: () => null,
}))

function templateRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "tpl-1",
    templateNumber: "TP-00001",
    templateTag: "Turn",
    propertyId: "prop-1",
    propertyName: "Oak Apartments",
    warehouseId: "",
    warehouseName: "",
    instructions: "",
    templateNotes: "",
    padProductId: "",
    padTypeLabel: "",
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("TemplatesClient", () => {
  beforeEach(() => {
    cleanup()
    resetSimpleTableClientMocks()
  })

  it("dashboard add routes to the canonical template create form", async () => {
    const user = userEvent.setup()

    render(
      <TemplatesClient
        initialTemplates={[]}
        propertyOptions={[{ id: "prop-1", name: "Oak Apartments" }]}
        warehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
        padProductOptions={[{ id: "pad-1", label: "Pad Product" }]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
      />,
    )

    await user.click(screen.getByRole("button", { name: /\+?Template$/ }))

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/templates/new?returnTo=%2Fdashboard%2Ftest",
      { scroll: false },
    )
  })

  it("clicking the template row routes to the canonical detail page", async () => {
    const user = userEvent.setup()

    render(
      <TemplatesClient
        initialTemplates={[templateRow()]}
        propertyOptions={[{ id: "prop-1", name: "Oak Apartments" }]}
        warehouseOptions={[]}
        padProductOptions={[]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Edit template TP-00001" }))
    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/dashboard/templates/tpl-1?returnTo=%2Fdashboard%2Ftest",
        { scroll: false },
      )
    })
  })

  it("table delete requires confirmation before request dispatch", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(false)

    render(
      <TemplatesClient
        initialTemplates={[templateRow()]}
        propertyOptions={[{ id: "prop-1", name: "Oak Apartments" }]}
        warehouseOptions={[]}
        padProductOptions={[]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect(window.confirm).toHaveBeenCalledWith("Delete this template? This cannot be undone.")
    expect(requestJsonMock).not.toHaveBeenCalled()
  })

  it("delete success removes the row", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)

    requestJsonMock.mockResolvedValueOnce({ ok: true })

    render(
      <TemplatesClient
        initialTemplates={[templateRow()]}
        propertyOptions={[{ id: "prop-1", name: "Oak Apartments" }]}
        warehouseOptions={[]}
        padProductOptions={[]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Delete" }))
    await waitFor(() => {
      expect(screen.queryByText("TP-00001")).toBeNull()
    })
  })

  it("delete failure surfaces the error and keeps the row", async () => {
    const user = userEvent.setup()
    vi.spyOn(window, "confirm").mockReturnValue(true)
    requestJsonMock.mockRejectedValueOnce(new Error("Failed to delete template"))

    render(
      <TemplatesClient
        initialTemplates={[templateRow()]}
        propertyOptions={[{ id: "prop-1", name: "Oak Apartments" }]}
        warehouseOptions={[]}
        padProductOptions={[]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Delete" }))

    expect((await screen.findAllByText("Failed to delete template")).length).toBeGreaterThan(0)
    expect(screen.getByText("TP-00001")).toBeTruthy()
  })
})
