// @vitest-environment jsdom

import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { WorkOrderMaterialItemsSection } from "@/features/flooring/work-orders/components/record/material-items-section"
import type { MaterialItemDraft } from "@/features/flooring/shared/line-items/material-items-editor"
import type { WorkOrderMaterialItem } from "@/features/flooring/work-orders/types"

afterEach(() => {
  cleanup()
})

const productOptions = [
  { id: "prod-1", label: "Broadloom", sendUnit: "SY" },
  { id: "prod-2", label: "Pad", sendUnit: "SY" },
]

function buildItem(overrides: Partial<WorkOrderMaterialItem> = {}): WorkOrderMaterialItem {
  return {
    id: "item-1",
    productId: "prod-1",
    productName: "Broadloom",
    sendUnit: "SY",
    quantity: "10",
    unitPrice: "12.55",
    notes: "",
    allocations: [],
    allocatedQuantity: 5,
    remainingQuantity: 5,
    materialExpense: 40,
    hasAllocationShortage: true,
    allocationStatus: "SHORTAGE",
    isAllocationDone: true,
    changeOrderStatus: "SHORTAGE",
    ...overrides,
  }
}

function Harness() {
  const [draft, setDraft] = React.useState<MaterialItemDraft>({
    productId: "",
    quantity: "",
    unitPrice: "",
    notes: "",
  })
  const [expandedItemIds, setExpandedItemIds] = React.useState<string[]>([])
  const items = React.useMemo(
    () => [
      buildItem({
        id: "item-1",
        productId: "prod-1",
        productName: "Broadloom",
        unitPrice: "10.00",
        quantity: "8",
        materialExpense: 25,
      }),
      buildItem({
        id: "item-2",
        productId: "prod-2",
        productName: "Pad",
        quantity: "4",
        unitPrice: "5.00",
        materialExpense: 10,
        remainingQuantity: 0,
        hasAllocationShortage: false,
        allocationStatus: "FULLY_ALLOCATED",
        isAllocationDone: true,
        changeOrderStatus: "SUFFICIENT",
      }),
    ],
    [],
  )

  return (
    <WorkOrderMaterialItemsSection
      title="Material Items"
      items={items}
      draft={draft}
      productOptions={productOptions}
      loading={false}
      adding={false}
      savingItemId={null}
      deletingItemId={null}
      draftErrors={{}}
      itemErrors={{}}
      expandedItemIds={expandedItemIds}
      onToggleExpandedItem={(itemId) =>
        setExpandedItemIds((previous) =>
          previous.includes(itemId) ? previous.filter((current) => current !== itemId) : [...previous, itemId],
        )
      }
      onDraftChange={(field, value) => setDraft((previous) => ({ ...previous, [field]: value }))}
      onAdd={async () => false}
      onItemFieldChange={vi.fn()}
      onSaveItem={vi.fn()}
      onDeleteItem={vi.fn()}
      onRequestAutoAllocation={vi.fn()}
      isAutoAllocating={false}
      renderAllocationSection={(item) => <div>Allocation rows for {item.id}</div>}
    />
  )
}

describe("WorkOrderMaterialItemsSection", () => {
  it("shows outer material and allocated totals in the collapsed section header", () => {
    render(<Harness />)

    expect(screen.getByText("Material Cost")).toBeTruthy()
    expect(screen.getByText("$100.00")).toBeTruthy()
    expect(screen.getByText("Allocated Cost")).toBeTruthy()
    expect(screen.getByText("$35.00")).toBeTruthy()
  })

  it("collapses the whole section and expands item subsections independently", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.queryByText("Allocation rows for item-1")).toBeNull()

    await user.click(screen.getByRole("button", { name: "Show allocations for Broadloom" }))
    expect(screen.getByText("Allocation rows for item-1")).toBeTruthy()
    expect(screen.queryByText("Allocation rows for item-2")).toBeNull()

    await user.click(screen.getByRole("button", { name: "Show allocations for Pad" }))
    expect(screen.getByText("Allocation rows for item-2")).toBeTruthy()

    await user.click(screen.getByRole("button", { name: "Collapse Material Items" }))
    expect(screen.queryByText("Allocation rows for item-1")).toBeNull()
    expect(screen.queryByText("Product")).toBeNull()
  })
})
