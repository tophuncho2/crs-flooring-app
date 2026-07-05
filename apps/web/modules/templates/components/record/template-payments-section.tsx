"use client"

import {
  ConfirmDialog,
  RecordItemSection,
  useRecordSectionToggle,
  type RecordSectionToggleSide,
} from "@/engines/record-view"
import type { useTemplatePlannedPaymentsSection } from "@/modules/templates/controllers/record/planned-payments/use-template-planned-payments-section"
import type { useTemplateInvoiceItemsSection } from "@/modules/templates/controllers/record/invoice-items/use-template-invoice-items-section"
import { TemplatePlannedPaymentsGrid } from "./planned-payments/template-planned-payments-grid"
import { TemplateInvoiceItemsGrid } from "./invoice-items/template-invoice-items-grid"

/** Which side the single §3 payments section is showing. Planned Payments is default. */
type SectionMode = "planned" | "invoice"

const MODE_NOUN: Record<SectionMode, string> = {
  planned: "planned payment",
  invoice: "invoice item",
}

type PlannedController = ReturnType<typeof useTemplatePlannedPaymentsSection>
type InvoiceController = ReturnType<typeof useTemplateInvoiceItemsSection>

/**
 * The templates record view's single §3 payments section, toggled between two
 * editable grids by an inline stepper:
 *   - Planned Payments (default, sky) — the repeatable payment plan (amount ·
 *     direction · date · notes · entity link).
 *   - Invoice Items (emerald) — a deliberately smaller mirror: amount ·
 *     direction · notes only (no date, no entity link).
 *
 * BOTH sides are independently editable, each with its OWN controller + draft.
 * Toggling away from a dirty side confirms, then DISCARDS that side's draft (the
 * shared section-toggle contract) — so the hidden side is always clean.
 */
export function TemplatePaymentsSection({
  planned,
  invoice,
}: {
  planned: PlannedController
  invoice: InvoiceController
}) {
  // Mode accent: sky = the plan (Planned Payments), emerald = the bill (Invoice Items).
  const sides: readonly [
    RecordSectionToggleSide<SectionMode>,
    RecordSectionToggleSide<SectionMode>,
  ] = [
    {
      key: "planned",
      label: "Planned Payments",
      accent: "border-sky-500/60 bg-sky-500/10 text-sky-800",
      isDirty: planned.isDirty,
      onDiscard: planned.discard,
    },
    {
      key: "invoice",
      label: "Invoice Items",
      accent: "border-emerald-500/60 bg-emerald-500/10 text-emerald-800",
      isDirty: invoice.isDirty,
      onDiscard: invoice.discard,
    },
  ]

  const { mode, activeLabel, stepper, dialogProps } = useRecordSectionToggle<SectionMode>({
    initialMode: "planned",
    sides,
  })

  const active = mode === "planned" ? planned : invoice
  const editable = !active.isSaving
  const count = active.items.length
  const noun = MODE_NOUN[mode]

  return (
    <>
      <RecordItemSection
        title={activeLabel}
        capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
        noticeMessage={active.noticeMessage}
        noticeError={active.noticeError}
        subHeader={{
          actionsLeading: stepper,
          statusLeading: (
            <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
              {count} {noun}
              {count === 1 ? "" : "s"}
            </span>
          ),
          isDirty: active.isDirty,
          isSaving: active.isSaving,
          hasConflict: active.hasConflict,
          onSave: () => void active.save(),
          onDiscard: () => active.discard(),
          saveLabel: "Save",
          savingLabel: "Saving...",
          discardLabel: "Discard",
          error: active.error ? active.error.message : null,
          actions: [
            {
              key: "add",
              label: `+ Add ${activeLabel.replace(/s$/, "")}`,
              kind: "add-row",
              onClick: active.addItem,
              disabled: active.isSaving,
            },
          ],
        }}
      >
        {mode === "planned" ? (
          <TemplatePlannedPaymentsGrid
            items={planned.items}
            editable={editable}
            onChangeField={planned.changeField}
            onSelectEntity={planned.selectEntity}
            onRemoveItem={planned.removeItem}
          />
        ) : (
          <TemplateInvoiceItemsGrid
            items={invoice.items}
            editable={editable}
            onChangeField={invoice.changeField}
            onRemoveItem={invoice.removeItem}
          />
        )}
      </RecordItemSection>

      <ConfirmDialog {...dialogProps} />
    </>
  )
}
