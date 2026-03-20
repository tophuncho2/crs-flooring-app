// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  requestJsonMock,
  resetSimpleTableClientMocks,
} from "./helpers/simple-table-client-mocks"
import InventoryClient from "@/features/flooring/inventory/components/inventory-client"

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
  runningBalance: string
  cost: string
  freight: string
  notes: string
  createdAt: string
  updatedAt: string
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
    runningBalance: "10.00",
    cost: "10.00",
    freight: "5.00",
    notes: "Current notes",
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
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

  it("renders shared row actions and colored import pills in the table", () => {
    render(
      <InventoryClient
        initialInventory={[inventoryRow()]}
        locationOptions={[{ id: "loc-1", warehouseId: "wh-1", locationCode: "A1", label: "A1", sectionName: "Showroom", warehouseName: "Main Warehouse" }]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
      />,
    )

    expect(screen.getAllByRole("button", { name: "Edit" }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: "Open" }).length).toBeGreaterThan(0)
    expect(screen.getByText("Purchase Order").className).toContain("bg-violet-200")
    expect(screen.getByText("Pending").className).toContain("bg-sky-200")
  })

  it("opens the read-only panel from the open button and removes the legacy cut-log table link", async () => {
    const user = userEvent.setup()

    render(
      <InventoryClient
        initialInventory={[inventoryRow()]}
        locationOptions={[{ id: "loc-1", warehouseId: "wh-1", locationCode: "A1", label: "A1", sectionName: "Showroom", warehouseName: "Main Warehouse" }]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
      />,
    )

    await user.click(screen.getAllByRole("button", { name: "Open" })[0]!)

    expect(screen.getByRole("heading", { name: "Inventory 1001" })).toBeTruthy()
    expect(screen.getByText("Cut Logs")).toBeTruthy()
    expect(screen.queryByText("Open Cut Logs Table")).toBeNull()
    expect(screen.getByText("Unit turn")).toBeTruthy()
  })

  it("opens the edit panel, uses shared footer actions, and saves the new location", async () => {
    const user = userEvent.setup()

    requestJsonMock.mockResolvedValueOnce({
      inventory: {
        ...inventoryRow(),
        locationId: "loc-2",
        locationCode: "B2",
        sectionName: "Reserve",
      },
    })

    render(
      <InventoryClient
        initialInventory={[inventoryRow()]}
        locationOptions={[
          { id: "loc-1", warehouseId: "wh-1", locationCode: "A1", label: "A1", sectionName: "Showroom", warehouseName: "Main Warehouse" },
          { id: "loc-2", warehouseId: "wh-1", locationCode: "B2", label: "B2", sectionName: "Reserve", warehouseName: "Main Warehouse" },
        ]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
      />,
    )

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]!)

    expect(screen.getByRole("button", { name: "Save Inventory" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Delete Inventory" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Add Cut Log" })).toBeTruthy()

    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "loc-2" } })
    await user.click(screen.getByRole("button", { name: "Save Inventory" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/flooring/inventory/inv-1", expect.objectContaining({
        method: "PATCH",
      }))
    })

    expect(requestJsonMock.mock.calls[0]?.[1]?.body).toContain('"locationId":"loc-2"')
    expect(await screen.findByText("Inventory saved")).toBeTruthy()
    expect(screen.getAllByText("Reserve").length).toBeGreaterThan(0)
  })
})
