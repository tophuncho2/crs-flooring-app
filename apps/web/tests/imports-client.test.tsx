// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { navigationMocks } from "./helpers/next-navigation-mock"
import { requestJsonMock, resetSimpleTableClientMocks } from "./helpers/simple-table-client-mocks"
import ImportsClient from "@/features/flooring/imports/components/imports-client"
import { ImportDetailClient } from "@/features/flooring/imports/record/detail/import-detail-client"
import { ImportCreateClient } from "@/features/flooring/imports/record/create/import-create-client"

vi.mock("@/features/flooring/shared/use-table-columns", () => ({
  useTableColumns: () => ({
    allColumns: [
      { key: "importNumber", label: "Import #" },
      { key: "tag", label: "Tag" },
      { key: "transport", label: "Transport" },
      { key: "status", label: "Status" },
      { key: "warehouse", label: "Warehouse" },
      { key: "created", label: "Created" },
      { key: "items", label: "Items" },
      { key: "delete", label: "Delete" },
    ],
    visibleColumns: [
      { key: "importNumber", label: "Import #" },
      { key: "tag", label: "Tag" },
      { key: "transport", label: "Transport" },
      { key: "status", label: "Status" },
      { key: "warehouse", label: "Warehouse" },
      { key: "created", label: "Created" },
      { key: "items", label: "Items" },
      { key: "delete", label: "Delete" },
    ],
    hiddenColumnKeys: [],
    toggleColumnVisibility: vi.fn(),
    moveColumn: vi.fn(),
    setColumnOrder: vi.fn(),
  }),
}))

vi.mock("@/features/flooring/shared/use-server-table-query-controls", () => ({
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

function importRow() {
  return {
    id: "imp-1",
    importNumber: 1,
    orderNumber: "PO-1",
    tag: "Spring Load",
    transportType: "PURCHASE_ORDER",
    status: "PENDING",
    notes: "Notes",
    warehouseId: "wh-1",
    warehouseName: "Main Warehouse",
    itemsCount: 1,
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    inventories: [
      {
        id: "inv-1",
        productId: "prod-1",
        productName: "Oak Plank",
        stockUnit: "SF",
        itemNumber: "1001",
        dyeLot: "DL-1",
        stockCount: "2",
        cost: "10",
        freight: "11",
        notes: "",
        locationId: "loc-1",
        locationCode: "A1",
        warehouseId: "wh-1",
        warehouseName: "Main Warehouse",
        sectionName: "Showroom",
      },
    ],
  }
}

describe("ImportsClient", () => {
  beforeEach(() => {
    resetSimpleTableClientMocks()
    vi.restoreAllMocks()
  })

  it("renders inline transport and status pills in the dashboard table", () => {
    render(
      <ImportsClient
        initialImports={[importRow()]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
        filterState={{ status: [], warehouseId: [] }}
        filterWarehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
      />,
    )

    expect(screen.getByText("Purchase Order").className).toContain("bg-violet-200")
    expect(within(screen.getByRole("table")).getByText("Pending").className).toContain("bg-sky-200")
  })

  it("dashboard add routes to the canonical import create form", async () => {
    const user = userEvent.setup()

    render(
      <ImportsClient
        initialImports={[]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
        filterState={{ status: [], warehouseId: [] }}
        filterWarehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
      />,
    )

    await user.click(screen.getByRole("button", { name: /\+?Import/ }))

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/flooring/imports/new?returnTo=%2Fdashboard%2Fflooring%2Ftest",
      { scroll: false },
    )
  })

  it("uses section-owned controls in the canonical import detail page", () => {
    render(
      <ImportDetailClient
        initialImport={importRow()}
        productOptions={[{ id: "prod-1", label: "Oak Plank", stockUnit: "SF" }]}
        warehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
        locationOptions={[{ id: "loc-1", warehouseId: "wh-1", locationCode: "A1", label: "A1" }]}
        backHref="/dashboard/flooring/imports"
      />,
    )

    expect(screen.getByText("Import IMP-0001")).toBeTruthy()
    expect(screen.getByText("Total Cost")).toBeTruthy()
    expect(screen.getByText("Rows")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Add Row" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save Import" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Delete Import" })).toBeTruthy()
    expect(screen.queryByTestId("record-options-menu")).toBeNull()
  })

  it("import create mode uses the canonical record-form route and redirects after primary save", async () => {
    const user = userEvent.setup()
    requestJsonMock.mockResolvedValueOnce({
      import: {
        ...importRow(),
        id: "imp-2",
        importNumber: 2,
        inventories: [],
        itemsCount: 0,
      },
    })

    render(
      <ImportCreateClient
        backHref="/dashboard/flooring/imports"
        warehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
      />,
    )

    expect(screen.getByText("New Import")).toBeTruthy()
    expect(screen.queryByText("Import Inventory Rows")).toBeNull()

    await user.selectOptions(screen.getByRole("combobox", { name: "Warehouse" }), "wh-1")
    await user.click(screen.getByRole("button", { name: "Create Import" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith(
        "/api/flooring/imports",
        expect.objectContaining({ method: "POST" }),
      )
    })

    const payload = JSON.parse(String(requestJsonMock.mock.calls[0]?.[1]?.body ?? "{}"))
    expect(payload).toMatchObject({
      warehouseId: "wh-1",
      items: [],
    })

    await waitFor(() => {
      expect(navigationMocks.push).toHaveBeenCalledWith(
        "/dashboard/flooring/imports/imp-2?returnTo=%2Fdashboard%2Fflooring%2Fimports",
        { scroll: false },
      )
    })
  })
})
