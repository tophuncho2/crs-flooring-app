"use client"

import { RecordItemSection } from "@/engines/record-view"
import type { useTemplatePlannedPaymentsSection } from "@/modules/templates/controllers/record/planned-payments/use-template-planned-payments-section"
import { TemplatePlannedPaymentsGrid } from "./planned-payments/template-planned-payments-grid"

type PlannedController = ReturnType<typeof useTemplatePlannedPaymentsSection>

/**
 * The templates record view's §3 section — the editable Planned Payments grid.
 * Formerly a Planned⇄Invoice toggle host; the Invoice Items side was retired,
 * so this is now a single grid with no stepper.
 */
export function TemplatePaymentsSection({ planned }: { planned: PlannedController }) {
  const editable = !planned.isSaving
  const count = planned.items.length

  return (
    <RecordItemSection
      title="Planned Payments"
      flush
      capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
      noticeMessage={planned.noticeMessage}
      noticeError={planned.noticeError}
      subHeader={{
        statusLeading: (
          <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
            {count} planned payment{count === 1 ? "" : "s"}
          </span>
        ),
        isDirty: planned.isDirty,
        isSaving: planned.isSaving,
        hasConflict: planned.hasConflict,
        onSave: () => void planned.save(),
        onDiscard: () => planned.discard(),
        saveLabel: "Save",
        savingLabel: "Saving...",
        discardLabel: "Discard",
        error: planned.error ? planned.error.message : null,
        actions: [
          {
            key: "add",
            label: "+ Add Planned Payment",
            kind: "add-row",
            onClick: planned.addItem,
            disabled: planned.isSaving,
          },
        ],
      }}
    >
      <TemplatePlannedPaymentsGrid
        items={planned.items}
        editable={editable}
        onChangeField={planned.changeField}
        onSelectEntity={planned.selectEntity}
        onSelectPaymentPurpose={planned.selectPaymentPurpose}
        onRemoveItem={planned.removeItem}
      />
    </RecordItemSection>
  )
}
