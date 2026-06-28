// @vitest-environment jsdom

/**
 * Guards the per-product "Requested" subtotal added to the work-order Adjustments
 * view. Adjustments and requested material items are NOT linked — they're
 * correlated client-side by productId — so the grid totals `requestedItems` per
 * product (with the item's send unit) and renders it left of Increases/Deductions.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type {
  EnrichedInventoryAdjustmentRow,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import { WorkOrderAdjustmentsGrid } from "@/modules/work-orders/components/record/material-items/work-order-adjustments-grid"

function adjustment(overrides: Partial<EnrichedInventoryAdjustmentRow> = {}): EnrichedInventoryAdjustmentRow {
  return {
    id: "adj-1",
    adjustmentNumber: "ADJ-1",
    inventoryId: "inv-1",
    inventoryNumber: "INV-1",
    rollPrefix: "R",
    rollNumber: "12",
    dyeLot: "DL-3",
    inventoryNote: "",
    location: "A1",
    productId: "prod-1",
    productName: "Berber Carpet",
    warehouseId: "wh-1",
    workOrderId: "wo-1",
    before: "100",
    quantity: "5",
    after: "95",
    cost: "10.00",
    freight: "2.50",
    stockUnitName: "square foot",
    stockUnitAbbrev: "sqft",
    adjustmentType: "DEDUCTION",
    status: "PENDING",
    isWaste: false,
    internalNotes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    workOrderNumber: "1001",
    warehouseName: "Main Warehouse",
    createdBy: "creator@crs.test",
    updatedBy: "editor@crs.test",
    ...overrides,
  } as EnrichedInventoryAdjustmentRow
}

function materialItem(overrides: Partial<WorkOrderMaterialItemRow> = {}): WorkOrderMaterialItemRow {
  return {
    id: "mir-1",
    productId: "prod-1",
    productName: "Berber Carpet",
    quantity: "8",
    sendUnitName: "square foot",
    sendUnitAbbrev: "sqft",
    notes: "",
    sourceTemplateItemId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function renderGrid({
  adjustments = [adjustment()],
  requestedItems = [] as WorkOrderMaterialItemRow[],
  onCreateWithProduct = vi.fn(),
}: {
  adjustments?: EnrichedInventoryAdjustmentRow[]
  requestedItems?: WorkOrderMaterialItemRow[]
  onCreateWithProduct?: (product: { id: string; name: string }) => void
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkOrderAdjustmentsGrid
        adjustments={adjustments}
        requestedItems={requestedItems}
        onOpenEdit={vi.fn()}
        onCreateWithProduct={onCreateWithProduct}
        onDuplicate={vi.fn()}
        onSplitOff={vi.fn()}
        onDelete={vi.fn()}
        isBusy={false}
      />
    </QueryClientProvider>,
  )
}

describe("WorkOrderAdjustmentsGrid — Requested subtotal", () => {
  afterEach(cleanup)

  it("totals requested material for the product with its send unit", () => {
    renderGrid({ requestedItems: [materialItem({ quantity: "8", sendUnitAbbrev: "sqft" })] })
    expect(screen.getByText("Requested")).toBeTruthy()
    expect(screen.getByText("8 sqft")).toBeTruthy()
  })

  it("sums multiple requested items for the same product", () => {
    renderGrid({
      requestedItems: [
        materialItem({ id: "mir-1", quantity: "8" }),
        materialItem({ id: "mir-2", quantity: "4.5" }),
      ],
    })
    expect(screen.getByText("12.5 sqft")).toBeTruthy()
  })

  it("shows an em-dash when the product group has no requested material", () => {
    renderGrid({ requestedItems: [] })
    expect(screen.getByText("Requested")).toBeTruthy()
    // Deduction total is "5 sqft"; the only "—" is the empty Requested value.
    expect(screen.getByText("—")).toBeTruthy()
  })

  it("correlates requested totals to each product group, not across products", () => {
    // The adjustment is for prod-1; the requested item is for a different product.
    // Each product gets its own group: prod-1's Requested stays "—" (no matching
    // requested), and the other product's 99 sqft renders only in its own group.
    renderGrid({
      requestedItems: [
        materialItem({ productId: "prod-OTHER", productName: "Vinyl Plank", quantity: "99" }),
      ],
    })
    // "Berber Carpet" appears in both its group header and the adjustment row cell.
    expect(screen.getAllByText("Berber Carpet").length).toBeGreaterThan(0)
    expect(screen.getByText("Vinyl Plank")).toBeTruthy()
    // prod-1 group has no matching requested material (its Requested shows "—",
    // alongside the requested-only group's empty Deductions)…
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
    // …and the other product's requested total renders in its own group.
    expect(screen.getByText("99 sqft")).toBeTruthy()
  })

  it("renders Requested to the left of Deductions", () => {
    const { container } = renderGrid({ requestedItems: [materialItem()] })
    const text = container.textContent ?? ""
    expect(text.indexOf("Requested")).toBeGreaterThanOrEqual(0)
    expect(text.indexOf("Requested")).toBeLessThan(text.indexOf("Deductions"))
  })
})

describe("WorkOrderAdjustmentsGrid — requested-only groups + create affordance", () => {
  afterEach(cleanup)

  it("renders a header + Requested total for a product with requested material but no adjustments", () => {
    renderGrid({ adjustments: [], requestedItems: [materialItem({ quantity: "8" })] })
    // Header for the requested-only product, with its Requested total…
    expect(screen.getByText("Berber Carpet")).toBeTruthy()
    expect(screen.getByText("Requested")).toBeTruthy()
    expect(screen.getByText("8 sqft")).toBeTruthy()
    // …Deductions shows the em-dash (no adjustment rows)…
    expect(screen.getByText("—")).toBeTruthy()
    // …and there is no adjustment row / DataTable for the group.
    expect(screen.queryByLabelText(/Open adjustment/)).toBeNull()
  })

  it("shows the empty placeholder only when both adjustments and requested material are empty", () => {
    renderGrid({ adjustments: [], requestedItems: [] })
    expect(screen.getByText(/No adjustments on this work order yet/)).toBeTruthy()

    cleanup()
    renderGrid({ adjustments: [], requestedItems: [materialItem()] })
    expect(screen.queryByText(/No adjustments on this work order yet/)).toBeNull()
  })

  it("calls onCreateWithProduct with the group's product when the header + is clicked", () => {
    const onCreateWithProduct = vi.fn()
    renderGrid({ adjustments: [], requestedItems: [materialItem()], onCreateWithProduct })
    fireEvent.click(screen.getByLabelText("Create adjustment with Berber Carpet"))
    expect(onCreateWithProduct).toHaveBeenCalledWith({ id: "prod-1", name: "Berber Carpet" })
  })

  it("no longer lists 'Create with matching product' in an adjustment row's options menu", () => {
    renderGrid({ adjustments: [adjustment()] })
    // Open the row ⋮ menu — the split-off action proves the menu is open…
    fireEvent.click(screen.getByLabelText("Options for adjustment ADJ-1"))
    expect(screen.getByText("Add inventory from adjustment")).toBeTruthy()
    // …and the create action no longer lives there (it moved to the group header).
    expect(screen.queryByText("Create with matching product")).toBeNull()
  })
})

describe("WorkOrderAdjustmentsGrid — within-group sort (newest first)", () => {
  afterEach(cleanup)

  it("renders the newest adjustment above the oldest within a product group", () => {
    const { container } = renderGrid({
      adjustments: [
        adjustment({
          id: "adj-old",
          adjustmentNumber: "ADJ-OLD",
          createdAt: "2026-01-01T00:00:00.000Z",
        }),
        adjustment({
          id: "adj-new",
          adjustmentNumber: "ADJ-NEW",
          createdAt: "2026-03-01T00:00:00.000Z",
        }),
      ],
    })
    const text = container.textContent ?? ""
    expect(text.indexOf("ADJ-NEW")).toBeGreaterThanOrEqual(0)
    expect(text.indexOf("ADJ-NEW")).toBeLessThan(text.indexOf("ADJ-OLD"))
  })

  it("breaks createdAt ties by id descending", () => {
    const at = "2026-02-01T00:00:00.000Z"
    const { container } = renderGrid({
      adjustments: [
        adjustment({ id: "adj-a", adjustmentNumber: "ADJ-A", createdAt: at }),
        adjustment({ id: "adj-b", adjustmentNumber: "ADJ-B", createdAt: at }),
      ],
    })
    const text = container.textContent ?? ""
    // Equal createdAt → id desc → "adj-b" (ADJ-B) leads "adj-a" (ADJ-A).
    expect(text.indexOf("ADJ-B")).toBeLessThan(text.indexOf("ADJ-A"))
  })
})
