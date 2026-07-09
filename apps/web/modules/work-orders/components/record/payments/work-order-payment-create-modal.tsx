"use client"

import { useRef, useState } from "react"
import { QuickCreateModal } from "@/engines/record-view"
import {
  describePaymentFormIssues,
  EMPTY_PAYMENT_FORM,
  validatePaymentForm,
  type PaymentForm,
  type WorkOrderDetail,
} from "@builders/domain"
import { getClientErrorMessage } from "@/transport"
import { createPaymentRequest } from "@/modules/payments/data/mutations"
import { PaymentPrimaryFieldsSection } from "@/modules/payments/components/record/primary/payment-primary-fields-section"

/**
 * Create a real payment pinned to this work order, from the WO record view.
 * Mirrors the adjustment create-modal contract (conditionally mounted so each
 * open starts clean; on success the host closes + reconciles via router.refresh).
 * The work order link is fixed on the draft and the WO picker is hidden
 * (`hideWorkOrder`) — the payment always belongs to this WO. Color is omitted on
 * create (create face has no `paymentNumber`), so new rows fall to the DB default;
 * color is edited later on the payment's own record view.
 */
export function WorkOrderPaymentCreateModal({
  workOrder,
  onClose,
  onCreated,
}: {
  workOrder: WorkOrderDetail
  onClose: () => void
  /** Fired after a successful create — the host closes the modal and reconciles. */
  onCreated: () => void
}) {
  // One stable idempotency key per mount — a retried submit replays instead of
  // inserting a second payment (the double-submit fix).
  const createKeyRef = useRef<string | null>(null)
  if (createKeyRef.current === null) createKeyRef.current = crypto.randomUUID()

  const [draft, setDraft] = useState<PaymentForm>({
    ...EMPTY_PAYMENT_FORM,
    workOrderId: workOrder.id,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canCreate = !isSaving && validatePaymentForm(draft).length === 0

  async function handleCreate() {
    const issues = validatePaymentForm(draft)
    if (issues.length > 0) {
      setError(describePaymentFormIssues(issues))
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      // Re-pin the WO id at submit — the picker is hidden so it can't drift, but
      // this guarantees the link regardless of any field edits.
      await createPaymentRequest({ ...draft, workOrderId: workOrder.id }, createKeyRef.current!)
      onCreated()
    } catch (caught) {
      setError(getClientErrorMessage(caught, "Could not create the payment. Please try again."))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <QuickCreateModal
      open
      title="Add payment"
      onClose={onClose}
      onCreate={handleCreate}
      canCreate={canCreate}
      isSaving={isSaving}
      error={error}
    >
      <PaymentPrimaryFieldsSection
        draft={draft}
        editable={!isSaving}
        hideWorkOrder
        onFieldChange={(field, value) =>
          setDraft((previous) => ({ ...previous, [field]: value }))
        }
      />
    </QuickCreateModal>
  )
}
