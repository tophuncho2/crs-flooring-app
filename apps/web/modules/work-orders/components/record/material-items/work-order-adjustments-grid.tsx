"use client"

import { useMemo } from "react"
import { Plus } from "lucide-react"
import {
  compareAdjustmentsByRecency,
  sumAdjustmentQuantities,
  type EnrichedInventoryAdjustmentRow,
  type WorkOrderMaterialItemRow,
} from "@builders/domain"
import {
  ADJUSTMENTS_LIST_COLUMNS,
  renderAdjustmentRowActions,
  renderAdjustmentsRowCell,
} from "@/modules/adjustments"
import { DataTable } from "@/engines/list-view"
import { CellAddButton } from "@/engines/common"

type ProductGroup = {
  productId: string
  productName: string
  rows: EnrichedInventoryAdjustmentRow[]
}

/**
 * Group by product over the union of adjustments AND requested-material items, so
 * a product with requested material but zero adjustments still gets a header (its
 * Requested total + the create affordance) before any adjustment exists.
 * Adjustments are folded in first, so a product carrying adjustments keeps the
 * adjustment's own product snapshot for the name; requested-only products fall
 * back to the material-item name and render with no rows. Within a group the rows
 * run newest-first (`createdAt` desc, id tiebreak) via `compareAdjustmentsByRecency`
 * — matching the inventory/standalone ledger order; the groups run product-name
 * ascending.
 */
function groupByProduct(
  adjustments: ReadonlyArray<EnrichedInventoryAdjustmentRow>,
  requestedItems: ReadonlyArray<WorkOrderMaterialItemRow>,
): ProductGroup[] {
  const groups: ProductGroup[] = []
  const byId = new Map<string, ProductGroup>()
  const ensure = (productId: string, productName: string) => {
    let group = byId.get(productId)
    if (!group) {
      group = { productId, productName, rows: [] }
      byId.set(productId, group)
      groups.push(group)
    }
    return group
  }
  for (const adj of adjustments) ensure(adj.productId, adj.productName).rows.push(adj)
  for (const item of requestedItems) ensure(item.productId, item.productName)
  for (const group of groups) group.rows.sort(compareAdjustmentsByRecency)
  groups.sort((a, b) => a.productName.localeCompare(b.productName))
  return groups
}

export type WorkOrderAdjustmentsGridProps = {
  /** Every adjustment on this work order (any product), enriched per row. */
  adjustments: ReadonlyArray<EnrichedInventoryAdjustmentRow>
  /**
   * The WO's persisted requested-material items. Used only to total requested
   * quantity per product (correlated by `productId` — adjustments and material
   * items carry no link) for the group header's "Requested" subtotal.
   */
  requestedItems: ReadonlyArray<WorkOrderMaterialItemRow>
  /** Open a saved adjustment on the inventory record view. */
  onOpenEdit: (adjustment: EnrichedInventoryAdjustmentRow) => void
  /** Open the create modal pre-filtered to this product (still changeable). */
  onCreateWithProduct: (product: { id: string; name: string }) => void
  /** Open the create modal pre-seeded with this row's inventory item. */
  onDuplicate: (adjustment: EnrichedInventoryAdjustmentRow) => void
  /** Navigate to the split-off create form seeded from this row's inventory. */
  onSplitOff: (adjustment: EnrichedInventoryAdjustmentRow) => void
  /** Open the delete confirm for this row (PENDING only; deletes the adjustment). */
  onDelete: (adjustment: EnrichedInventoryAdjustmentRow) => void
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
  requestedItems,
  onOpenEdit,
  onCreateWithProduct,
  onDuplicate,
  onSplitOff,
  onDelete,
  isBusy,
}: WorkOrderAdjustmentsGridProps) {
  const groups = useMemo(
    () => groupByProduct(adjustments, requestedItems),
    [adjustments, requestedItems],
  )

  // Per-product requested-material total, keyed by productId. Reuses the same
  // sum helper as the adjustment subtotals (and the print views) by mapping each
  // item's send unit into the `stockUnitAbbrev` slot the helper reads.
  const requestedByProduct = useMemo(() => {
    const byProduct = new Map<string, WorkOrderMaterialItemRow[]>()
    for (const item of requestedItems) {
      const list = byProduct.get(item.productId)
      if (list) list.push(item)
      else byProduct.set(item.productId, [item])
    }
    const totals = new Map<string, { quantity: string; stockUnitAbbrev: string }>()
    for (const [productId, items] of byProduct) {
      totals.set(
        productId,
        sumAdjustmentQuantities(
          items.map((item) => ({ quantity: item.quantity, stockUnitAbbrev: item.sendUnitAbbrev })),
        ),
      )
    }
    return totals
  }, [requestedItems])

  if (adjustments.length === 0 && requestedItems.length === 0) {
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
        const requestedTotal = requestedByProduct.get(group.productId)
        return (
          <div key={group.productId} className="space-y-2 border-b border-[var(--panel-border)] pb-5 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-3 px-1">
              {/* Create affordance (+) sits left of the product name — the
                  obvious "start an adjustment for this product" action, and the
                  only create entry point for a requested-only group (no rows, so
                  no row ⋮ menu). Opens the create modal pre-filtered to this
                  product. */}
              <span className="flex items-center gap-2">
                <CellAddButton
                  onClick={() =>
                    onCreateWithProduct({ id: group.productId, name: group.productName })
                  }
                  ariaLabel={`Create adjustment with ${group.productName}`}
                  title="Create with matching product"
                  disabled={isBusy}
                  className="h-8 w-8"
                  icon={<Plus size={18} aria-hidden="true" />}
                />
                <span className="text-base font-semibold text-[var(--foreground)]">
                  {group.productName}
                </span>
              </span>
              <span className="flex items-center gap-4 text-base uppercase tracking-wide text-[var(--foreground)]/55">
                {/* Requested material total (sky) — the customer's requested
                    quantity for this product, correlated by productId. Sits left
                    of the adjustment subtotals; shows "—" when this product has
                    no requested material. */}
                <span>
                  <span className="font-bold">Requested</span>{" "}
                  <span className="tabular-nums text-sky-700/80">
                    {requestedTotal?.quantity || "—"}
                    {requestedTotal?.quantity && requestedTotal.stockUnitAbbrev
                      ? ` ${requestedTotal.stockUnitAbbrev}`
                      : ""}
                  </span>
                </span>
                {increases.length > 0 ? (
                  <span>
                    <span className="font-bold">Increases</span>{" "}
                    <span className="tabular-nums text-emerald-700/80">
                      +{increaseTotal.quantity}
                      {increaseTotal.quantity && increaseTotal.stockUnitAbbrev ? ` ${increaseTotal.stockUnitAbbrev}` : ""}
                    </span>
                  </span>
                ) : null}
                <span>
                  <span className="font-bold">Deductions</span>{" "}
                  <span className="tabular-nums text-rose-800/80">
                    {deductionTotal.quantity || "—"}
                    {deductionTotal.quantity && deductionTotal.stockUnitAbbrev ? ` ${deductionTotal.stockUnitAbbrev}` : ""}
                  </span>
                </span>
              </span>
            </div>
            {group.rows.length > 0 ? (
              <DataTable<EnrichedInventoryAdjustmentRow>
                rows={group.rows}
                columns={ADJUSTMENTS_LIST_COLUMNS}
                renderCell={renderAdjustmentsRowCell}
                onOpenRow={(row) => onOpenEdit(row)}
                getRowAriaLabel={(row) => `Open adjustment ${row.adjustmentNumber}`}
                rowActions={(row) =>
                  renderAdjustmentRowActions(
                    row,
                    { onSplitOff, onDuplicate, onDelete },
                    isBusy,
                  )
                }
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
