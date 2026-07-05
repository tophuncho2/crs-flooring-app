"use client"

import { RecordItemSection } from "@/engines/record-view"
import type { useTemplatePlannedPaymentsSection } from "@/modules/templates/controllers/record/planned-payments/use-template-planned-payments-section"
import { TemplatePlannedPaymentsGrid } from "./template-planned-payments-grid"

type PlannedPaymentsController = ReturnType<typeof useTemplatePlannedPaymentsSection>

/**
 * The templates record view's §3 Planned Payments section — a single editable
 * grid of the template's payment plan. Standalone for now (own controller +
 * draft); the Invoice Payments mirror + a Planned⇄Invoice toggle host arrive in
 * a later pass, at which point this becomes one side of that toggle.
 */
export function TemplatePlannedPaymentsSection({
  plannedPayments,
}: {
  plannedPayments: PlannedPaymentsController
}) {
  const editable = !plannedPayments.isSaving
  const count = plannedPayments.items.length

  return (
    <RecordItemSection
      title="Planned Payments"
      capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
      noticeMessage={plannedPayments.noticeMessage}
      noticeError={plannedPayments.noticeError}
      subHeader={{
        statusLeading: (
          <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
            {count} planned payment{count === 1 ? "" : "s"}
          </span>
        ),
        isDirty: plannedPayments.isDirty,
        isSaving: plannedPayments.isSaving,
        hasConflict: plannedPayments.hasConflict,
        onSave: () => void plannedPayments.save(),
        onDiscard: () => plannedPayments.discard(),
        saveLabel: "Save",
        savingLabel: "Saving...",
        discardLabel: "Discard",
        error: plannedPayments.error ? plannedPayments.error.message : null,
        actions: [
          {
            key: "add",
            label: "+ Add Planned Payment",
            kind: "add-row",
            onClick: plannedPayments.addItem,
            disabled: plannedPayments.isSaving,
          },
        ],
      }}
    >
      <TemplatePlannedPaymentsGrid
        items={plannedPayments.items}
        editable={editable}
        onChangeField={plannedPayments.changeField}
        onRemoveItem={plannedPayments.removeItem}
      />
    </RecordItemSection>
  )
}
