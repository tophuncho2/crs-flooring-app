"use client"

import { useMemo, type ReactNode } from "react"
import { Copy, Plus } from "lucide-react"
import { sumAssignmentQuantities, type EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { renderAdjustmentReadOnlyCell } from "@/modules/adjustments"
import { Grid } from "@/engines/record-view"
import { RecordOpenButton, RecordOptionsMenu } from "@/engines/common"
import { WORK_ORDER_ADJUSTMENT_LAYOUT } from "./work-order-adjustment-row-layout"

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
  /** True while a section save / mutation is in flight — disables row options. */
  isBusy: boolean
}

/**
 * The work order's "Adjustments" view (outflow): every adjustment fulfilling
 * this WO, grouped by product into stacked blocks. Each block is the shared
 * ledger Grid (leading open ↗ + trailing options ⋮) closed by a per-product
 * Σ-quantity subtotal under a rule, with a divider between products — the same
 * shape as the print files. Read-only rows; edits open the inventory record view.
 */
export function WorkOrderAdjustmentsGrid({
  adjustments,
  onOpenEdit,
  onCreateWithProduct,
  onDuplicate,
  isBusy,
}: WorkOrderAdjustmentsGridProps) {
  const groups = useMemo(() => groupByProduct(adjustments), [adjustments])
  const renderCell = useMemo(() => renderAdjustmentReadOnlyCell({}), [])

  function renderControl(
    control: { key: string; kind: string },
    row: EnrichedInventoryAdjustmentRow,
  ): ReactNode {
    if (control.kind === "open") {
      return (
        <RecordOpenButton
          ariaLabel={`Open adjustment ${row.adjustmentNumber}`}
          title="Open this adjustment"
          onClick={() => onOpenEdit(row)}
        />
      )
    }
    if (control.kind === "actions") {
      const isPending = row.status === "PENDING"
      return (
        <RecordOptionsMenu
          ariaLabel={`Options for adjustment ${row.adjustmentNumber}`}
          items={[
            {
              key: "create-matching",
              label: "Create with matching product",
              icon: <Plus size={14} aria-hidden="true" />,
              onClick: () => onCreateWithProduct({ id: row.productId, name: row.productName }),
              disabled: isBusy,
            },
            {
              key: "duplicate",
              label: "Duplicate adjustment",
              icon: <Copy size={14} aria-hidden="true" />,
              onClick: () => onDuplicate(row),
              disabled: !isPending || isBusy,
            },
          ]}
        />
      )
    }
    return null
  }

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
        const deductions = group.rows.filter((row) => row.adjustmentType === "DEDUCTION")
        const { quantity, stockUnitAbbrev } = sumAssignmentQuantities(deductions)
        return (
          <div key={group.productId} className="space-y-2 border-b border-[var(--panel-border)] pb-5 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-3 px-1">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {group.productName}
              </span>
              <span className="text-xs uppercase tracking-wide text-[var(--foreground)]/55">
                Subtotal{" "}
                <span className="tabular-nums text-[var(--foreground)]/80">
                  {quantity || "—"}
                  {quantity && stockUnitAbbrev ? ` ${stockUnitAbbrev}` : ""}
                </span>
              </span>
            </div>
            <Grid<EnrichedInventoryAdjustmentRow>
              rows={group.rows}
              layout={WORK_ORDER_ADJUSTMENT_LAYOUT}
              renderCell={renderCell}
              renderControl={renderControl}
            />
          </div>
        )
      })}
    </div>
  )
}
