// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  requestJsonMock,
  resetSimpleTableClientMocks,
} from "./helpers/simple-table-client-mocks"
import { navigationMocks } from "./helpers/next-navigation-mock"
import InventoryClient from "@/features/flooring/inventory/components/inventory-client"
import { InventoryDetailClient } from "@/features/flooring/inventory/components/detail/inventory-detail-client"

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

type InventoryRow = {
  id: string
  importEntryId: string
  importWarehouseId: string
  importNumber: string
  importTag: string
  importStatus: string
  importTransportType: string
  importWarehouseName: string
  productId: string
  productName: string
  stockUnit: string
  itemNumber: string
  dyeLot: string
  locationId: string
  locationCode: string
  warehouseId: string
  warehouseName: string
  sectionName: string
  stockCount: string
  cutTotal: string
  reservedStockCount: string
  totalAllocated: string
  unreservedTotal: string
  availableToAllocate: string
  runningBalance: string
  cost: string
  freight: string
  notes: string
  createdAt: string
  updatedAt: string
  canCreateCutLogs: boolean
  cutLogBlockedReason: string
  cutLogs: Array<{
    id: string
    inventoryId: string
    inventoryLabel: string
    itemNumber: string
    before: string
    cut: string
    after: string
    notes: string
    createdAt: string
  }>
}

function inventoryRow(overrides: Partial<InventoryRow> = {}): InventoryRow {
  return {
    id: "inv-1",
    importEntryId: "imp-1",
    importWarehouseId: "wh-1",
    importNumber: "1",
    importTag: "Spring Load",
    importStatus: "PENDING",
    importTransportType: "PURCHASE_ORDER",
    importWarehouseName: "Main Warehouse",
    productId: "prod-1",
    productName: "Oak Plank",
    stockUnit: "SF",
    itemNumber: "1001",
    dyeLot: "DL-1",
    locationId: "loc-1",
    locationCode: "A1",
    warehouseId: "wh-1",
    warehouseName: "Main Warehouse",
    sectionName: "Showroom",
    stockCount: "12.00",
    cutTotal: "2.00",
    reservedStockCount: "3.00",
    totalAllocated: "3.00",
    unreservedTotal: "10.00",
    availableToAllocate: "7.00",
    runningBalance: "10.00",
    cost: "10.00",
    freight: "5.00",
    notes: "Current notes",
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    canCreateCutLogs: false,
    cutLogBlockedReason: "Pending import inventory cannot be cut until the import is marked Final.",
    cutLogs: [
      {
        id: "cut-1",
        inventoryId: "inv-1",
        inventoryLabel: "Oak Plank",
        itemNumber: "1001",
        before: "12.00",
        cut: "2.00",
        after: "10.00",
        notes: "Unit turn",
        createdAt: "2026-03-19T00:00:00.000Z",
      },
    ],
    ...overrides,
  }
}

describe("InventoryClient", () => {
  beforeEach(() => {
    resetSimpleTableClientMocks()
    vi.restoreAllMocks()
    vi.stubGlobal("confirm", vi.fn(() => true))
  })

  it("renders clickable rows, colored import pills, and routes to the canonical detail page", async () => {
    const user = userEvent.setup()

    render(
      <InventoryClient
        initialInventory={[inventoryRow()]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
        filterState={{ status: [], warehouseId: [], categoryId: [], productId: [] }}
        warehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
        categoryOptions={[{ id: "cat-1", name: "Hard Surface" }]}
        productOptions={[{ id: "prod-1", label: "Oak Plank" }]}
      />,
    )

    expect(screen.getByRole("button", { name: "Open inventory item 1001" })).toBeTruthy()
    expect(screen.getByText("Purchase Order").className).toContain("bg-violet-200")
    expect(within(screen.getByRole("table")).getByText("Pending").className).toContain("bg-sky-200")
    expect(screen.getByText("Allocated Inventory")).toBeTruthy()
    expect(screen.getByText("Open Inventory")).toBeTruthy()
    expect(screen.getByText("3 SF")).toBeTruthy()
    expect(screen.getByText("7 SF")).toBeTruthy()

    await user.click(screen.getByRole("button", { name: "Open inventory item 1001" }))

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/dashboard/flooring/inventory/inv-1?returnTo=%2Fdashboard%2Fflooring%2Ftest",
      { scroll: false },
    )
  })

  it("uses the canonical detail page shell and removes the legacy cut-log table link", () => {
    render(
      <InventoryDetailClient
        initialRecord={inventoryRow({ importStatus: "FINAL", canCreateCutLogs: true, cutLogBlockedReason: "" })}
        locationOptions={[{ id: "loc-1", warehouseId: "wh-1", locationCode: "A1", label: "A1", sectionName: "Showroom", warehouseName: "Main Warehouse" }]}
        backHref="/dashboard/flooring/inventory"
      />,
    )

    expect(screen.getByRole("heading", { name: "Inventory 1001" })).toBeTruthy()
    expect(screen.getByText("Product")).toBeTruthy()
    expect(screen.getByText("Oak Plank")).toBeTruthy()
    expect(screen.getByText("Warehouse")).toBeTruthy()
    expect(screen.getAllByText("Main Warehouse").length).toBeGreaterThan(0)
    expect(screen.getByText("Import #")).toBeTruthy()
    expect(screen.getByText("IMP-0001")).toBeTruthy()
    expect(screen.getByText("Cut Logs")).toBeTruthy()
    expect(screen.queryByText("Open Cut Logs Table")).toBeNull()
    expect(screen.queryByText("Product", { selector: "p" })).toBeTruthy()
    expect(screen.queryByText("Import Tag")).toBeNull()
    expect(screen.queryByText("Running Balance")).toBeTruthy()
    expect(screen.queryByText("Cuts Total")).toBeTruthy()
    expect(screen.queryByText("Starting Stock")).toBeTruthy()
    expect(screen.queryByText("Section")).toBeTruthy()
    expect(screen.queryByText(/^Item #$/)).toBeTruthy()
    expect(screen.queryByText(/^Lot$/)).toBeTruthy()
    expect(screen.queryByText(/^Cost$/)).toBeTruthy()
    expect(screen.queryByText(/^Freight$/)).toBeTruthy()
    expect(screen.getByLabelText("Notes")).toBeTruthy()
    expect(screen.getByDisplayValue("Current notes")).toBeTruthy()
    expect(screen.getByText("Unit turn")).toBeTruthy()
  })

  it("does not render the no-cut-logs empty-state copy when there are no cut logs", () => {
    render(
      <InventoryDetailClient
        initialRecord={inventoryRow({
          importStatus: "FINAL",
          canCreateCutLogs: true,
          cutLogBlockedReason: "",
          cutLogs: [],
          cutTotal: "0.00",
          runningBalance: "12.00",
        })}
        locationOptions={[{ id: "loc-1", warehouseId: "wh-1", locationCode: "A1", label: "A1", sectionName: "Showroom", warehouseName: "Main Warehouse" }]}
        backHref="/dashboard/flooring/inventory"
      />,
    )

    expect(screen.queryByText("No cut logs yet for this inventory row.")).toBeNull()
    expect(screen.getByRole("button", { name: "Add Cut Log" })).toBeTruthy()
  })

  it("opens the edit panel, uses shared footer actions, and saves the new location", async () => {
    const user = userEvent.setup()

    requestJsonMock.mockResolvedValueOnce({
      inventory: {
        ...inventoryRow({ importStatus: "FINAL", canCreateCutLogs: true, cutLogBlockedReason: "" }),
        locationId: "loc-2",
        locationCode: "B2",
        sectionName: "Reserve",
        itemNumber: "1002",
        dyeLot: "DL-2",
        cost: "12.50",
        freight: "7.25",
        notes: "Reserved side stack",
      },
    })

    render(
      <InventoryDetailClient
        initialRecord={inventoryRow({ importStatus: "FINAL", canCreateCutLogs: true, cutLogBlockedReason: "" })}
        locationOptions={[
          { id: "loc-1", warehouseId: "wh-1", locationCode: "A1", label: "A1", sectionName: "Showroom", warehouseName: "Main Warehouse" },
          { id: "loc-2", warehouseId: "wh-1", locationCode: "B2", label: "B2", sectionName: "Reserve", warehouseName: "Main Warehouse" },
        ]}
        backHref="/dashboard/flooring/inventory"
      />,
    )

    expect(screen.getByRole("button", { name: "Save Inventory" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Delete Inventory" })).toBeTruthy()
    expect(screen.getByRole("button", { name: /Back/ })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Add Cut Log" })).toBeTruthy()

    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "loc-2" } })
    fireEvent.change(screen.getByLabelText("Item #"), { target: { value: "1002" } })
    fireEvent.change(screen.getByLabelText("Lot"), { target: { value: "DL-2" } })
    fireEvent.change(screen.getByLabelText("Cost"), { target: { value: "12.50" } })
    fireEvent.change(screen.getByLabelText("Freight"), { target: { value: "7.25" } })
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Reserved side stack" } })
    await user.click(screen.getByRole("button", { name: "Save Inventory" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/flooring/inventory/inv-1", expect.objectContaining({
        method: "PATCH",
      }))
    })

    expect(requestJsonMock.mock.calls[0]?.[1]?.body).toContain('"locationId":"loc-2"')
    expect(requestJsonMock.mock.calls[0]?.[1]?.body).toContain('"itemNumber":"1002"')
    expect(requestJsonMock.mock.calls[0]?.[1]?.body).toContain('"dyeLot":"DL-2"')
    expect(requestJsonMock.mock.calls[0]?.[1]?.body).toContain('"cost":"12.50"')
    expect(requestJsonMock.mock.calls[0]?.[1]?.body).toContain('"freight":"7.25"')
    expect(requestJsonMock.mock.calls[0]?.[1]?.body).toContain('"notes":"Reserved side stack"')
    expect(requestJsonMock.mock.calls[0]?.[1]?.body).not.toContain("stockCount")
    expect(requestJsonMock.mock.calls[0]?.[1]?.body).not.toContain("productId")
    expect(await screen.findByText("Inventory saved")).toBeTruthy()
    expect(screen.getAllByText("Reserve").length).toBeGreaterThan(0)
    expect(screen.getByDisplayValue("Reserved side stack")).toBeTruthy()
  })

  it("updates the inventory URL filters without keeping the previous page param", async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, "", "/dashboard/flooring/test?page=3")

    render(
      <InventoryClient
        initialInventory={[inventoryRow()]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
        filterState={{ status: [], warehouseId: [], categoryId: [], productId: [] }}
        warehouseOptions={[
          { id: "wh-1", name: "Main Warehouse" },
          { id: "wh-2", name: "Overflow Warehouse" },
        ]}
        categoryOptions={[{ id: "cat-1", name: "Hard Surface" }]}
        productOptions={[{ id: "prod-1", label: "Oak Plank" }]}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Filter" }))
    await user.click(screen.getByRole("button", { name: "Pending" }))
    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/dashboard/flooring/test?status=pending&sort=asc&grouped=0",
      { scroll: false },
    )

    await user.click(screen.getByRole("button", { name: "Overflow Warehouse" }))
    expect(navigationMocks.replace).toHaveBeenLastCalledWith(
      "/dashboard/flooring/test?warehouse=wh-2&sort=asc&grouped=0",
      { scroll: false },
    )
  })

  it("shows the pending-cut warning and disables cut creation for pending import rows", () => {
    render(
      <InventoryDetailClient
        initialRecord={inventoryRow()}
        locationOptions={[{ id: "loc-1", warehouseId: "wh-1", locationCode: "A1", label: "A1", sectionName: "Showroom", warehouseName: "Main Warehouse" }]}
        backHref="/dashboard/flooring/inventory"
      />,
    )

    expect(screen.getByText("Pending import inventory cannot be cut until the import is marked Final.")).toBeTruthy()
    expect((screen.getByRole("button", { name: "Add Cut Log" }) as HTMLButtonElement).disabled).toBe(true)
  })
})
