import type { ReactNode } from "react"
import { Copy, Plus, Split, Trash2 } from "lucide-react"
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
  /**
   * "Delete adjustment" — remove the row (PENDING rows only). Wired ONLY by the
   * record-view tables (inventory record list + work-order record grid); the
   * standalone `/dashboard/adjustments` ledger omits it, so the item never shows
   * there. The host owns the confirm prompt + the delete mutation.
   */
  onDelete?: (row: EnrichedInventoryAdjustmentRow) => void
}

/**
 * Build the shared adjustment row ⋮ options menu, in canonical order
 * (split-off → create-matching → duplicate → delete). Each item is included only
 * when its handler is supplied; `isBusy` disables every item and Duplicate +
 * Delete additionally require `row.status === "PENDING"`. Returns `null` when no
 * handler applies (no menu rendered). Designed to slot straight into `DataTable`'s
 * `rowActions`.
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
  if (handlers.onDelete) {
    items.push({
      key: "delete",
      label: "Delete adjustment",
      icon: <Trash2 size={14} aria-hidden="true" />,
      onClick: () => handlers.onDelete?.(row),
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
