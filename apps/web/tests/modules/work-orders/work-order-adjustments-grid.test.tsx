// @vitest-environment jsdom

/**
 * Guards the per-product "Requested" subtotal added to the work-order Adjustments
 * view. Adjustments and requested material items are NOT linked — they're
 * correlated client-side by productId — so the grid totals `requestedItems` per
 * product (with the item's send unit) and renders it left of Increases/Deductions.
 */

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
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
    inventoryItem: "Berber R12",
    inventoryNumber: "INV-1",
    rollPrefix: "R",
    rollNumber: "12",
    dyeLot: "DL-3",
    inventoryNote: "",
    location: "A1",
    categorySlug: "carpet",
    productId: "prod-1",
    productName: "Berber Carpet",
    warehouseId: "wh-1",
    workOrderId: "wo-1",
    before: "100",
    quantity: "5",
    after: "95",
    stockUnitName: "square foot",
    stockUnitAbbrev: "sqft",
    adjustmentType: "DEDUCTION",
    status: "PENDING",
    isWaste: false,
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    workOrderNumber: "1001",
    warehouseName: "Main Warehouse",
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
    status: "IDLE",
    sourceTemplateItemId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function renderGrid({
  adjustments = [adjustment()],
  requestedItems = [] as WorkOrderMaterialItemRow[],
}: {
  adjustments?: EnrichedInventoryAdjustmentRow[]
  requestedItems?: WorkOrderMaterialItemRow[]
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
        onCreateWithProduct={vi.fn()}
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

  it("only totals requested items matching the group's product", () => {
    renderGrid({
      requestedItems: [materialItem({ productId: "prod-OTHER", quantity: "99" })],
    })
    expect(screen.queryByText("99 sqft")).toBeNull()
    expect(screen.getByText("—")).toBeTruthy()
  })

  it("renders Requested to the left of Deductions", () => {
    const { container } = renderGrid({ requestedItems: [materialItem()] })
    const text = container.textContent ?? ""
    expect(text.indexOf("Requested")).toBeGreaterThanOrEqual(0)
    expect(text.indexOf("Requested")).toBeLessThan(text.indexOf("Deductions"))
  })
})
