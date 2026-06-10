"use client"

import { useCallback } from "react"
import type { Contact, LaborPayment } from "@builders/domain"
import { useLaborPaymentEditController } from "./use-labor-payment-edit-controller"

/**
 * Labor-payments section of the contact record view. Owns the edit state machine
 * pointed at this contact, plus the two open-spec builders the drilldown detail
 * face needs:
 *   - `openCreate()` → a new labor payment seeded with this contact (editable).
 *   - `openEdit(row)` → edit an existing payment.
 * `onMutated` fires after every mutation so the host refreshes the paginated list.
 * Mirrors `useInventoryAdjustmentsSection`.
 */
export function useContactLaborPaymentsSection({
  contact,
  onMutated,
}: {
  contact: Contact
  onMutated: () => void
}) {
  const panel = useLaborPaymentEditController({ publish: onMutated })

  const openCreate = useCallback(() => {
    panel.openPanel({
      mode: "create",
      seed: { contactId: contact.id, contactName: contact.name },
    })
  }, [panel, contact.id, contact.name])

  const openEdit = useCallback(
    (row: LaborPayment) => {
      panel.openPanel({ mode: "edit", laborPayment: row })
    },
    [panel],
  )

  return { panel, openCreate, openEdit }
}
