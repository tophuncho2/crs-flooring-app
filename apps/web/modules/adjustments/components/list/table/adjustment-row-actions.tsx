import type { ReactNode } from "react"
import { Copy, Plus, Split } from "lucide-react"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"
import { RecordOptionsMenu, type RecordOptionsMenuItem } from "@/engines/common"

/**
 * Handlers for the shared adjustment row ⋮ menu. Every adjustment `DataTable`
 * deployment renders the SAME action stack from {@link renderAdjustmentRowActions};
 * a host passes only the handlers it supports and an omitted handler drops that
 * item — "propped out cleanly". Add inventory (split-off) is host-agnostic
 * navigation; create-with-product + duplicate require the host to mount an
 * adjustment create modal.
 */
export type AdjustmentRowActionHandlers = {
  /** "Add inventory from adjustment" — open the split-off create form. */
  onSplitOff?: (row: EnrichedInventoryAdjustmentRow) => void
  /** "Create with matching product" — open create pre-filtered to the row's product. */
  onCreateWithProduct?: (product: { id: string; name: string }) => void
  /** "Duplicate adjustment" — pre-seed create with the row's inventory (PENDING rows only). */
  onDuplicate?: (row: EnrichedInventoryAdjustmentRow) => void
}

/**
 * Build the shared adjustment row ⋮ options menu, in canonical order
 * (split-off → create-matching → duplicate). Each item is included only when its
 * handler is supplied; `isBusy` disables every item and Duplicate additionally
 * requires `row.status === "PENDING"`. Returns `null` when no handler applies (no
 * menu rendered). Designed to slot straight into `DataTable`'s `rowActions`.
 */
export function renderAdjustmentRowActions(
  row: EnrichedInventoryAdjustmentRow,
  handlers: AdjustmentRowActionHandlers,
  isBusy = false,
): ReactNode {
  const items: RecordOptionsMenuItem[] = []

  if (handlers.onSplitOff) {
    items.push({
      key: "split-off",
      label: "Add inventory from adjustment",
      icon: <Split size={14} aria-hidden="true" />,
      onClick: () => handlers.onSplitOff?.(row),
      disabled: isBusy,
    })
  }
  if (handlers.onCreateWithProduct) {
    items.push({
      key: "create-matching",
      label: "Create with matching product",
      icon: <Plus size={14} aria-hidden="true" />,
      onClick: () => handlers.onCreateWithProduct?.({ id: row.productId, name: row.productName }),
      disabled: isBusy,
    })
  }
  if (handlers.onDuplicate) {
    items.push({
      key: "duplicate",
      label: "Duplicate adjustment",
      icon: <Copy size={14} aria-hidden="true" />,
      onClick: () => handlers.onDuplicate?.(row),
      disabled: row.status !== "PENDING" || isBusy,
    })
  }

  if (items.length === 0) return null

  return (
    <RecordOptionsMenu
      ariaLabel={`Options for adjustment ${row.adjustmentNumber}`}
      items={items}
    />
  )
}
