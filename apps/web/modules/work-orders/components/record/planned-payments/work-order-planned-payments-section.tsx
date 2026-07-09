"use client"

import { RecordItemSection } from "@/engines/record-view"
import type { useWorkOrderPlannedPaymentsSection } from "@/modules/work-orders/controllers/record/planned-payments/use-work-order-planned-payments-section"
import { WorkOrderPlannedPaymentsGrid } from "./work-order-planned-payments-grid"

type PlannedPaymentsController = ReturnType<typeof useWorkOrderPlannedPaymentsSection>

/**
 * The work order's Planned Payments section — a standalone editable grid (amount ·
 * direction · notes · entity link), mirroring the templates planned-payments
 * section but with no toggle. (A later pass pairs it with a payments-module-linked
 * section behind a toggle.) Managed save/discard + add-row chrome lives in the
 * shared RecordItemSection subHeader.
 */
export function WorkOrderPlannedPaymentsSection({
  section,
}: {
  section: PlannedPaymentsController
}) {
  const editable = !section.isSaving
  const count = section.items.length

  return (
    <RecordItemSection
      title="Planned Payments"
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
        onRemoveItem={section.removeItem}
      />
    </RecordItemSection>
  )
}
