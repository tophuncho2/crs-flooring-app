"use client"

import { useMemo } from "react"
import { sumAdjustmentQuantities, type EnrichedInventoryAdjustmentRow } from "@builders/domain"
import {
  ADJUSTMENTS_LIST_COLUMNS,
  renderAdjustmentRowActions,
  renderAdjustmentsRowCell,
} from "@/modules/adjustments"
import { DataTable } from "@/engines/list-view"

type ProductGroup = {
  productId: string
  productName: string
  rows: EnrichedInventoryAdjustmentRow[]
}

/**
 * Group the flat WO-adjustment set by product (the adjustment's own product
 * snapshot — adjustments no longer link to a material item). Within a group the
 * rows run quantity-ascending (id tiebreak); the groups run product-name
 * ascending. Mirrors the print Slip / Picking Ticket grouping.
 */
function groupByProduct(
  adjustments: ReadonlyArray<EnrichedInventoryAdjustmentRow>,
): ProductGroup[] {
  const groups: ProductGroup[] = []
  const byId = new Map<string, ProductGroup>()
  for (const adj of adjustments) {
    let group = byId.get(adj.productId)
    if (!group) {
      group = { productId: adj.productId, productName: adj.productName, rows: [] }
      byId.set(adj.productId, group)
      groups.push(group)
    }
    group.rows.push(adj)
  }
  for (const group of groups) {
    group.rows.sort((a, b) => {
      const byQuantity = Number(a.quantity) - Number(b.quantity)
      return byQuantity !== 0 ? byQuantity : a.id.localeCompare(b.id)
    })
  }
  groups.sort((a, b) => a.productName.localeCompare(b.productName))
  return groups
}

export type WorkOrderAdjustmentsGridProps = {
  /** Every adjustment on this work order (any product), enriched per row. */
  adjustments: ReadonlyArray<EnrichedInventoryAdjustmentRow>
  /** Open a saved adjustment on the inventory record view. */
  onOpenEdit: (adjustment: EnrichedInventoryAdjustmentRow) => void
  /** Open the create modal pre-filtered to this product (still changeable). */
  onCreateWithProduct: (product: { id: string; name: string }) => void
  /** Open the create modal pre-seeded with this row's inventory item. */
  onDuplicate: (adjustment: EnrichedInventoryAdjustmentRow) => void
  /** Navigate to the split-off create form seeded from this row's inventory. */
  onSplitOff: (adjustment: EnrichedInventoryAdjustmentRow) => void
  /** True while a section save / mutation is in flight — disables row options. */
  isBusy: boolean
}

/**
 * The work order's "Adjustments" view (outflow): every adjustment fulfilling
 * this WO, grouped by product into stacked blocks. Each block is the shared
 * ledger DataTable (open ↗ + options ⋮ paired in the leading gutter) closed by a
 * per-product Σ-quantity subtotal under a rule, with a divider between products —
 * the same shape, and the same row rendering, as the standalone adjustments
 * ledger. Read-only rows; edits open the inventory record view.
 */
export function WorkOrderAdjustmentsGrid({
  adjustments,
  onOpenEdit,
  onCreateWithProduct,
  onDuplicate,
  onSplitOff,
  isBusy,
}: WorkOrderAdjustmentsGridProps) {
  const groups = useMemo(() => groupByProduct(adjustments), [adjustments])

  if (adjustments.length === 0) {
    return (
      <div className="border border-[var(--panel-border)] bg-[var(--panel-border)]/5 px-4 py-8 text-center text-sm text-[var(--foreground)]/65">
        No adjustments on this work order yet. Use “Add Adjustment” to pull material.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        // Two per-product subtotals: deductions (outflow that fulfils the WO) and
        // increases (inflow / returns). Both are by product. Deductions always
        // show; the increases subtotal appears only when this product has any.
        const deductions = group.rows.filter((row) => row.adjustmentType === "DEDUCTION")
        const increases = group.rows.filter((row) => row.adjustmentType === "INCREASE")
        const deductionTotal = sumAdjustmentQuantities(deductions)
        const increaseTotal = sumAdjustmentQuantities(increases)
        return (
          <div key={group.productId} className="space-y-2 border-b border-[var(--panel-border)] pb-5 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-3 px-1">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {group.productName}
              </span>
              <span className="flex items-center gap-4 text-xs uppercase tracking-wide text-[var(--foreground)]/55">
                {increases.length > 0 ? (
                  <span>
                    Increases{" "}
                    <span className="tabular-nums text-emerald-700/80">
                      +{increaseTotal.quantity}
                      {increaseTotal.quantity && increaseTotal.stockUnitAbbrev ? ` ${increaseTotal.stockUnitAbbrev}` : ""}
                    </span>
                  </span>
                ) : null}
                <span>
                  Deductions{" "}
                  <span className="tabular-nums text-[var(--foreground)]/80">
                    {deductionTotal.quantity || "—"}
                    {deductionTotal.quantity && deductionTotal.stockUnitAbbrev ? ` ${deductionTotal.stockUnitAbbrev}` : ""}
                  </span>
                </span>
              </span>
            </div>
            <DataTable<EnrichedInventoryAdjustmentRow>
              rows={group.rows}
              columns={ADJUSTMENTS_LIST_COLUMNS}
              renderCell={renderAdjustmentsRowCell}
              onOpenRow={(row) => onOpenEdit(row)}
              getRowAriaLabel={(row) => `Open adjustment ${row.adjustmentNumber}`}
              rowActions={(row) =>
                renderAdjustmentRowActions(
                  row,
                  { onSplitOff, onCreateWithProduct, onDuplicate },
                  isBusy,
                )
              }
            />
          </div>
        )
      })}
    </div>
  )
}
