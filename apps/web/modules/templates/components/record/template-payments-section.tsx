"use client"

import { useCallback, useState } from "react"
import { ConfirmDialog, RecordItemSection, RecordStepper, useRecordSwapGuard } from "@/engines/record-view"
import type { useTemplatePlannedPaymentsSection } from "@/modules/templates/controllers/record/planned-payments/use-template-planned-payments-section"
import type { useTemplateInvoiceItemsSection } from "@/modules/templates/controllers/record/invoice-items/use-template-invoice-items-section"
import { TemplatePlannedPaymentsGrid } from "./planned-payments/template-planned-payments-grid"
import { TemplateInvoiceItemsGrid } from "./invoice-items/template-invoice-items-grid"

/** Which side the single §3 payments section is showing. Planned Payments is default. */
type SectionMode = "planned" | "invoice"

const MODE_LABEL: Record<SectionMode, string> = {
  planned: "Planned Payments",
  invoice: "Invoice Items",
}

const MODE_NOUN: Record<SectionMode, string> = {
  planned: "planned payment",
  invoice: "invoice item",
}

// Mode accent: sky = the plan (Planned Payments), emerald = the bill (Invoice Items).
const MODE_ACCENT: Record<SectionMode, string> = {
  planned: "border-sky-500/60 bg-sky-500/10 text-sky-800",
  invoice: "border-emerald-500/60 bg-emerald-500/10 text-emerald-800",
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
 * Flipping preserves both drafts (nothing is discarded), so the swap guard is
 * switch-flavored and keyed to the ACTIVE side.
 */
export function TemplatePaymentsSection({
  planned,
  invoice,
}: {
  planned: PlannedController
  invoice: InvoiceController
}) {
  const [mode, setMode] = useState<SectionMode>("planned")

  // Flipping away from a dirty grid warns first, but the flip KEEPS the edits
  // (each controller holds its own draft, preserved across the toggle), so the
  // copy is switch-flavored. Guard only when the ACTIVE side is dirty.
  const { guard, dialogProps } = useRecordSwapGuard({
    isDirty: (mode === "planned" && planned.isDirty) || (mode === "invoice" && invoice.isDirty),
    title: "Switch view?",
    discardMessage:
      "This view has unsaved changes. Switch views? Your edits stay until you save or leave the template.",
    confirmLabel: "Switch & keep editing",
    cancelLabel: "Stay here",
  })

  const flipMode = useCallback(() => {
    guard(() => setMode((prev) => (prev === "planned" ? "invoice" : "planned")))
  }, [guard])

  const stepper = (
    <RecordStepper
      label={MODE_LABEL[mode]}
      onPrevious={flipMode}
      onNext={flipMode}
      previousAriaLabel="Show the other view"
      nextAriaLabel="Show the other view"
      accent={MODE_ACCENT[mode]}
    />
  )

  const active = mode === "planned" ? planned : invoice
  const editable = !active.isSaving
  const count = active.items.length
  const noun = MODE_NOUN[mode]

  return (
    <>
      <RecordItemSection
        title={MODE_LABEL[mode]}
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
              label: `+ Add ${MODE_LABEL[mode].replace(/s$/, "")}`,
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
