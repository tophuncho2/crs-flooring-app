import type { ReactNode } from "react"
import { Trash2 } from "lucide-react"
import type { PaymentListRow } from "@builders/domain"
import { RecordOptionsMenu, type RecordOptionsMenuItem } from "@/engines/common"

/**
 * Handlers for the shared payment row ⋮ menu. A host passes only the handlers it
 * supports and an omitted handler drops that item — "propped out cleanly".
 */
export type PaymentRowActionHandlers = {
  /**
   * "Delete payment" — hard-delete the row. Wired ONLY by the work-order
   * record-view Payments section; the standalone `/dashboard/payments` list omits
   * it, so the item never shows there. The host owns the confirm prompt + the
   * delete mutation.
   */
  onDelete?: (row: PaymentListRow) => void
}

/**
 * Build the shared payment row ⋮ options menu. Each item is included only when its
 * handler is supplied; `isBusy` disables every item while a mutation is in flight.
 * Returns `null` when no handler applies (no menu rendered). Slots straight into
 * `PaymentsTable`'s / `DataTable`'s `rowActions`.
 */
export function renderPaymentRowActions(
  row: PaymentListRow,
  handlers: PaymentRowActionHandlers,
  isBusy = false,
): ReactNode {
  const items: RecordOptionsMenuItem[] = []

  if (handlers.onDelete) {
    items.push({
      key: "delete",
      label: "Delete payment",
      icon: <Trash2 size={14} aria-hidden="true" />,
      onClick: () => handlers.onDelete?.(row),
      disabled: isBusy,
    })
  }

  if (items.length === 0) return null

  return (
    <RecordOptionsMenu ariaLabel={`Options for payment ${row.paymentNumber}`} items={items} />
  )
}
