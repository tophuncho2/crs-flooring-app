// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ImportsClient from "@/features/flooring/imports/components/imports-client"
import { ImportDetailClient } from "@/features/flooring/imports/components/import-detail-client"

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  }
}

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

vi.mock("@/features/flooring/shared/record-options-menu", () => ({
  RecordOptionsMenu: ({
    items,
  }: {
    items: Array<{ label: string; onSelect?: () => void; disabled?: boolean }>
  }) => (
    <div data-testid="record-options-menu">
      {items.map((item) => (
        <button key={item.label} type="button" disabled={item.disabled} onClick={() => item.onSelect?.()}>
          {item.label}
        </button>
      ))}
    </div>
  ),
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
    vi.restoreAllMocks()
    vi.stubGlobal("fetch", vi.fn())
    Object.defineProperty(window, "location", {
      value: { assign: vi.fn() },
      writable: true,
    })
  })

  it("renders inline transport and status pills in the dashboard table", () => {
    render(
      <ImportsClient
        initialImports={[importRow()]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
        filterState={{ status: "all", warehouseId: "all" }}
        filterWarehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
      />,
    )

    expect(screen.getByText("Purchase Order").className).toContain("bg-violet-200")
    expect(within(screen.getByRole("table")).getByText("Pending").className).toContain("bg-sky-200")
  })

  it("uses header-only import number and header metrics in the canonical detail page", () => {
    render(
      <ImportDetailClient
        initialImport={importRow()}
        productOptions={[{ id: "prod-1", label: "Oak Plank", stockUnit: "SF" }]}
        warehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
        locationOptions={[{ id: "loc-1", warehouseId: "wh-1", locationCode: "A1", label: "A1" }]}
        backHref="/dashboard/flooring/imports"
      />,
    )

    expect(screen.getByRole("heading", { name: "Import IMP-0001" })).toBeTruthy()
    expect(screen.getByText("Total Cost")).toBeTruthy()
    expect(screen.getAllByText("$21.00")).toHaveLength(2)
    expect(screen.getByText("Material Items").parentElement?.textContent).toContain("1")
    expect(screen.getByRole("button", { name: "Add Import Inventory Item" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Save Import" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Delete Import" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Add Item" })).toBeNull()
  })

  it("uses the shared child-table pattern in the create form and requires at least one item row", async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({
        productOptions: [{ id: "prod-1", label: "Oak Plank", stockUnit: "SF" }],
        warehouseOptions: [{ id: "wh-1", name: "Main Warehouse" }],
        locationOptions: [{ id: "loc-1", warehouseId: "wh-1", locationCode: "A1", label: "A1" }],
      }),
    )

    render(
      <ImportsClient
        initialImports={[]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
        filterState={{ status: "all", warehouseId: "all" }}
        filterWarehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
      />,
    )

    await user.click(screen.getAllByRole("button", { name: /\+?Import/ })[0]!)

    expect(screen.queryByLabelText("Import Number")).toBeNull()
    expect(screen.getByRole("button", { name: "Add Inventory Item" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Add Item" })).toBeNull()

    fireEvent.change(screen.getAllByLabelText("Import Warehouse")[0]!, { target: { value: "wh-1" } })
    await user.click(screen.getAllByRole("button", { name: "Create Import" })[0]!)

    expect(await screen.findByText("Add at least one inventory row before creating the import")).toBeTruthy()
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url, options]) => (
      url === "/api/flooring/imports" &&
      typeof options === "object" &&
      options !== null &&
      "method" in options &&
      options.method === "POST"
    ))).toBe(false)
  })
})
