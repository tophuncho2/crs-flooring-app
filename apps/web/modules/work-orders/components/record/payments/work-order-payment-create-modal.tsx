"use client"

import { useRef, useState } from "react"
import { QuickCreateModal } from "@/engines/record-view"
import {
  describePaymentFormIssues,
  EMPTY_PAYMENT_FORM,
  validatePaymentForm,
  type EntityTypeRef,
  type PaletteColor,
  type Payment,
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
 *
 * An optional `seed` pre-fills the form (e.g. launched from a planned-payment or
 * entity-involvement row's ⋮ "Create payment"); `seedLabels` hydrates the
 * entity/purpose picker triggers so the seeded links read back immediately. Both
 * are omitted by the plain "+ Add Payment" flow, which starts blank.
 */
export function WorkOrderPaymentCreateModal({
  workOrder,
  seed,
  seedLabels,
  onClose,
  onCreated,
}: {
  workOrder: WorkOrderDetail
  /** Optional partial form to pre-fill (from a planned-payment / involvement row). */
  seed?: Partial<PaymentForm>
  /** Picker-trigger label hydration so seeded entity/purpose links read back on open. */
  seedLabels?: {
    entityName?: string | null
    entityType?: EntityTypeRef | null
    paymentPurposeName?: string | null
    paymentPurposeColor?: PaletteColor | null
  }
  onClose: () => void
  /**
   * Fired after a successful create with the new payment — the host closes the
   * modal, then presents the "go to payment / stay" choice.
   */
  onCreated: (payment: Payment) => void
}) {
  // One stable idempotency key per mount — a retried submit replays instead of
  // inserting a second payment (the double-submit fix).
  const createKeyRef = useRef<string | null>(null)
  if (createKeyRef.current === null) createKeyRef.current = crypto.randomUUID()

  const [draft, setDraft] = useState<PaymentForm>({
    ...EMPTY_PAYMENT_FORM,
    ...seed,
    // Re-pin the WO after the seed so a seeded row can never override the link.
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
      const { payment } = await createPaymentRequest(
        { ...draft, workOrderId: workOrder.id },
        createKeyRef.current!,
      )
      onCreated(payment)
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
      widthClassName="max-w-5xl"
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
        entityName={seedLabels?.entityName}
        entityType={seedLabels?.entityType}
        linkedEntityId={draft.entityId}
        paymentPurposeName={seedLabels?.paymentPurposeName}
        paymentPurposeColor={seedLabels?.paymentPurposeColor}
        onFieldChange={(field, value) =>
          setDraft((previous) => ({ ...previous, [field]: value }))
        }
      />
    </QuickCreateModal>
  )
}
