"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { RecordItemSection } from "@/engines/record-view"
import type { PaymentForm, WorkOrderDetail } from "@builders/domain"
import type {
  useWorkOrderEntityInvolvementSection,
  WorkOrderEntityInvolvementLocal,
} from "@/modules/work-orders/controllers/record/entity-involvement/use-work-order-entity-involvement-section"
import { WorkOrderPaymentCreateModal } from "../payments/work-order-payment-create-modal"
import { WorkOrderEntityInvolvementGrid } from "./work-order-entity-involvement-grid"

type EntityInvolvementController = ReturnType<typeof useWorkOrderEntityInvolvementSection>

// Seed a payment-create form off an involvement row — only the entity link (the
// row carries no amount/direction/purpose); those stay at form defaults.
type PaymentSeed = {
  seed: Partial<PaymentForm>
  labels: {
    entityName?: string | null
    entityType?: WorkOrderEntityInvolvementLocal["entityType"]
  }
}

function buildPaymentSeed(item: WorkOrderEntityInvolvementLocal): PaymentSeed {
  return {
    seed: { entityId: item.entityId },
    labels: { entityName: item.entityName, entityType: item.entityType },
  }
}

/**
 * The work order's Entity Involvement section — a standalone editable grid (entity ·
 * type · involvement type) capturing why an entity is involved in the job (separate
 * from the entity's own type). Managed save/discard + add-row chrome lives in the
 * shared RecordItemSection subHeader.
 *
 * A row's ⋮ "Create payment" opens the shared WorkOrderPaymentCreateModal seeded
 * from that row's entity; on success the sibling Payments section is reconciled.
 */
export function WorkOrderEntityInvolvementSection({
  section,
  workOrder,
}: {
  section: EntityInvolvementController
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
        title="Entity Involvement"
        flush
        capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
        noticeMessage={section.noticeMessage}
        noticeError={section.noticeError}
        subHeader={{
          statusLeading: (
            <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
              {count} entit{count === 1 ? "y" : "ies"}
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
              key: "add-entity-involvement",
              label: "+ Add Entity",
              kind: "add-row",
              onClick: section.addItem,
              disabled: section.isSaving,
            },
          ],
        }}
      >
        <WorkOrderEntityInvolvementGrid
          items={section.items}
          editable={editable}
          onChangeField={section.changeField}
          onSelectEntity={section.selectEntity}
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
