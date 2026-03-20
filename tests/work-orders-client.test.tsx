// @vitest-environment jsdom

import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  requestJsonMock,
  resetSimpleTableClientMocks,
} from "./helpers/simple-table-client-mocks"
import WorkOrdersClient from "@/features/flooring/work-orders/components/work-orders-client"

vi.mock("@/features/flooring/work-orders/components/work-order-record-panel", () => ({
  WorkOrderRecordPanel: ({ workOrderId }: { workOrderId: string }) => <div>{`Panel ${workOrderId}`}</div>,
}))

vi.mock("@/features/flooring/shared/primary-record-panel", async () => {
  const ReactModule = await import("react")

  return {
    PRIMARY_RECORD_PANEL_WIDTH_CLASS: "max-w-7xl",
    usePrimaryRecordPanel: () => {
      const [activeRecordId, setActiveRecordId] = ReactModule.useState<string | null>(null)

      return {
        activeRecordId,
        openRecord: (recordId: string) => setActiveRecordId(recordId),
        closeRecord: () => setActiveRecordId(null),
      }
    },
  }
})

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

vi.mock("@/features/flooring/shared/record-line-summary", () => ({
  RecordLineSummary: () => null,
}))

vi.mock("@/features/flooring/shared/record-options-menu", () => ({
  RecordOptionsMenu: ({
    items,
  }: {
    items: Array<{ label: string; onSelect?: () => void; disabled?: boolean }>
  }) => (
    <div data-testid="record-options-menu">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => item.onSelect?.()}
          disabled={item.disabled}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

type WorkOrderRow = {
  id: string
  workOrderNumber: string
  propertyId: string
  templateId: string
  propertyName: string
  propertyAddress: string
  warehouseId: string
  warehouseName: string
  status: string
  statusLabel: string
  isComplete: boolean
  hasShortage?: boolean
  vacancy: "VACANT" | "OCCUPIED" | null
  date: string | null
  unitText: string
  unitNumber: string
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  workOrderImageUrl: string
  itemsCount: number
  createdAt: string
  updatedAt: string
}

function workOrderRow(overrides: Partial<WorkOrderRow> = {}): WorkOrderRow {
  return {
    id: "wo-1",
    workOrderNumber: "WO-00001",
    propertyId: "prop-1",
    templateId: "",
    propertyName: "Oak Apartments",
    propertyAddress: "123 Main St",
    warehouseId: "wh-1",
    warehouseName: "Main Warehouse",
    status: "BUILDING_ORDER",
    statusLabel: "Building Order",
    isComplete: false,
    hasShortage: false,
    vacancy: null,
    date: null,
    unitText: "",
    unitNumber: "",
    unitType: "",
    customAddress: "",
    instructions: "",
    notes: "",
    workOrderImageUrl: "",
    itemsCount: 0,
    createdAt: "2026-03-19T00:00:00.000Z",
    updatedAt: "2026-03-19T00:00:00.000Z",
    ...overrides,
  }
}

describe("WorkOrdersClient", () => {
  beforeEach(() => {
    resetSimpleTableClientMocks()
  })

  it("creates a work order from the table-level sync flow and opens the created row", async () => {
    const user = userEvent.setup()

    requestJsonMock.mockResolvedValue({
      workOrder: workOrderRow({
        id: "wo-2",
        workOrderNumber: "WO-00002",
        templateId: "tpl-1",
        instructions: "Template instructions",
        itemsCount: 2,
      }),
    })

    render(
      <WorkOrdersClient
        initialWorkOrders={[]}
        propertyOptions={[{ id: "prop-1", name: "Oak Apartments", address: "123 Main St" }]}
        warehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
        productOptions={[]}
        templateOptions={[
          { id: "tpl-1", propertyId: "prop-1", label: "Oak Apartments / Turn" },
          { id: "tpl-2", propertyId: "prop-1", label: "Oak Apartments / Full Rehab" },
        ]}
        serviceOptions={[]}
        unitOptions={[]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Sync Template" }))
    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "prop-1" } })
    await user.type(screen.getByLabelText("Search Templates"), "Turn")
    await user.click(screen.getByRole("button", { name: /Oak Apartments \/ Turn/ }))
    await user.click(screen.getByRole("button", { name: "Create And Open Work Order" }))

    await waitFor(() => {
      expect(requestJsonMock).toHaveBeenCalledWith("/api/flooring/work-orders", expect.objectContaining({
        method: "POST",
      }))
    })

    const createPayload = requestJsonMock.mock.calls[0]?.[1] as { body: string }
    expect(JSON.parse(createPayload.body)).toEqual(expect.objectContaining({
      propertyId: "prop-1",
      templateId: "tpl-1",
      status: "BUILDING_ORDER",
    }))

    expect(await screen.findByText("WO-00002")).toBeTruthy()
    expect(screen.getByText("Panel wo-2")).toBeTruthy()
  })

  it("requires property and template selection, filters templates by property and search, and surfaces create errors", async () => {
    const user = userEvent.setup()

    requestJsonMock.mockRejectedValue(new Error("Failed to create work order from template"))

    render(
      <WorkOrdersClient
        initialWorkOrders={[]}
        propertyOptions={[
          { id: "prop-1", name: "Oak Apartments", address: "123 Main St" },
          { id: "prop-2", name: "Pine Grove", address: "987 Elm St" },
        ]}
        warehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
        productOptions={[]}
        templateOptions={[
          { id: "tpl-1", propertyId: "prop-1", label: "Oak Apartments / Turn" },
          { id: "tpl-2", propertyId: "prop-2", label: "Pine Grove / Rehab" },
        ]}
        serviceOptions={[]}
        unitOptions={[]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Sync Template" }))
    expect((screen.getByRole("button", { name: "Create And Open Work Order" }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText("Property"), { target: { value: "prop-1" } })
    expect(screen.getByRole("button", { name: /Oak Apartments \/ Turn/ })).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Pine Grove \/ Rehab/ })).toBeNull()
    expect((screen.getByRole("button", { name: "Create And Open Work Order" }) as HTMLButtonElement).disabled).toBe(true)

    const searchInput = screen.getByLabelText("Search Templates")
    expect((searchInput as HTMLInputElement).disabled).toBe(false)
    await user.type(searchInput, "Rehab")
    expect(screen.queryByRole("button", { name: /Oak Apartments \/ Turn/ })).toBeNull()

    await user.clear(searchInput)
    await user.click(screen.getByRole("button", { name: /Oak Apartments \/ Turn/ }))
    expect((screen.getByRole("button", { name: "Create And Open Work Order" }) as HTMLButtonElement).disabled).toBe(false)
    await user.click(screen.getByRole("button", { name: "Create And Open Work Order" }))

    expect(await screen.findByText("Failed to create work order from template")).toBeTruthy()
    expect(screen.queryByText(/^Panel /)).toBeNull()
  })

  it("removes Sync Template from the record-panel options menu", async () => {
    const user = userEvent.setup()

    render(
      <WorkOrdersClient
        initialWorkOrders={[workOrderRow()]}
        propertyOptions={[{ id: "prop-1", name: "Oak Apartments", address: "123 Main St" }]}
        warehouseOptions={[{ id: "wh-1", name: "Main Warehouse" }]}
        productOptions={[]}
        templateOptions={[{ id: "tpl-1", propertyId: "prop-1", label: "Oak Apartments / Turn" }]}
        serviceOptions={[]}
        unitOptions={[]}
        tableState={{ searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] }}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Edit" }))

    const optionsMenu = screen.getByTestId("record-options-menu")

    expect(within(optionsMenu).queryByRole("button", { name: "Sync Template" })).toBeNull()
    expect(within(optionsMenu).getByRole("button", { name: "Complete" })).toBeTruthy()
    expect(within(optionsMenu).getByRole("button", { name: "Invoice" })).toBeTruthy()
  })
})
