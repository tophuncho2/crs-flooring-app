"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { RecordItemSection } from "@/engines/record-view"
import type { PaymentForm, WorkOrderDetail } from "@builders/domain"
import type {
  useWorkOrderPlannedPaymentsSection,
  WorkOrderPlannedPaymentLocal,
} from "@/modules/work-orders/controllers/record/planned-payments/use-work-order-planned-payments-section"
import { WorkOrderPaymentCreateModal } from "../payments/work-order-payment-create-modal"
import { WorkOrderPlannedPaymentsGrid } from "./work-order-planned-payments-grid"

type PlannedPaymentsController = ReturnType<typeof useWorkOrderPlannedPaymentsSection>

// Seed a payment-create form off a planned-payment row (notes → internalNotes;
// amount/direction/entity/purpose carried; everything else falls to defaults).
type PaymentSeed = {
  seed: Partial<PaymentForm>
  labels: {
    entityName?: string | null
    entityType?: WorkOrderPlannedPaymentLocal["entityType"]
    paymentPurposeName?: string | null
    paymentPurposeColor?: WorkOrderPlannedPaymentLocal["paymentPurposeColor"]
  }
}

function buildPaymentSeed(item: WorkOrderPlannedPaymentLocal): PaymentSeed {
  return {
    seed: {
      amount: item.amount,
      direction: item.direction,
      internalNotes: item.notes,
      entityId: item.entityId,
      paymentPurposeId: item.paymentPurposeId,
    },
    labels: {
      entityName: item.entityName,
      entityType: item.entityType,
      paymentPurposeName: item.paymentPurposeName,
      paymentPurposeColor: item.paymentPurposeColor,
    },
  }
}

/**
 * The work order's Planned Payments section — a standalone editable grid (entity ·
 * purpose · amount · direction · notes), mirroring the templates planned-payments
 * section but with no toggle. Managed save/discard + add-row chrome lives in the
 * shared RecordItemSection subHeader.
 *
 * A row's ⋮ "Create payment" opens the shared WorkOrderPaymentCreateModal seeded
 * from that row; on success the sibling Payments section is reconciled so the new
 * payment appears (this editable grid keeps its own draft state).
 */
export function WorkOrderPlannedPaymentsSection({
  section,
  workOrder,
}: {
  section: PlannedPaymentsController
  workOrder: WorkOrderDetail
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [paymentSeed, setPaymentSeed] = useState<PaymentSeed | null>(null)
  const editable = !section.isSaving
  const count = section.items.length

  return (
    <>
      <RecordItemSection
        title="Planned Payments"
        flush
        capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
        noticeMessage={section.noticeMessage}
        noticeError={section.noticeError}
        subHeader={{
          statusLeading: (
            <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
              {count} planned payment{count === 1 ? "" : "s"}
            </span>
          ),
          isDirty: section.isDirty,
          isSaving: section.isSaving,
          hasConflict: section.hasConflict,
          onSave: () => void section.save(),
          onDiscard: () => section.discard(),
          saveLabel: "Save",
          savingLabel: "Saving...",
          discardLabel: "Discard",
          error: section.error ? section.error.message : null,
          actions: [
            {
              key: "add-planned-payment",
              label: "+ Add Planned Payment",
              kind: "add-row",
              onClick: section.addItem,
              disabled: section.isSaving,
            },
          ],
        }}
      >
        <WorkOrderPlannedPaymentsGrid
          items={section.items}
          editable={editable}
          onChangeField={section.changeField}
          onSelectEntity={section.selectEntity}
          onSelectPaymentPurpose={section.selectPaymentPurpose}
          onRemoveItem={section.removeItem}
          onCreatePayment={(item) => setPaymentSeed(buildPaymentSeed(item))}
        />
      </RecordItemSection>

      {/* Mounted as a SIBLING of the section (house convention) — the modal
          portals to <body>, so mount location doesn't affect the overlay. */}
      {paymentSeed ? (
        <WorkOrderPaymentCreateModal
          workOrder={workOrder}
          seed={paymentSeed.seed}
          seedLabels={paymentSeed.labels}
          onClose={() => setPaymentSeed(null)}
          onCreated={() => {
            // Close, then reconcile the sibling Payments section so the new row
            // shows (it reads the server prop; router.refresh re-runs the loader).
            setPaymentSeed(null)
            void queryClient.invalidateQueries({ queryKey: ["payments"] })
            void queryClient.invalidateQueries({ queryKey: ["work-orders"] })
            router.refresh()
          }}
        />
      ) : null}
    </>
  )
}
