"use client"

import { useCallback, useState } from "react"
import { ConfirmDialog, RecordItemSection, RecordStepper, useRecordSwapGuard } from "@/engines/record-view"
import type { useTemplatePlannedProductsSection } from "@/modules/templates/controllers/record/planned-products/use-template-planned-products-section"
import type { useTemplateInvoiceProductsSection } from "@/modules/templates/controllers/record/invoice-products/use-template-invoice-products-section"
import { TemplatePlannedProductsGrid } from "./planned-products/template-planned-products-grid"
import { TemplateInvoiceProductsGrid } from "./invoice-products/template-invoice-products-grid"

/** Which side the single §2 section is showing. Planned Products is default. */
type SectionMode = "planned" | "invoice"

const MODE_LABEL: Record<SectionMode, string> = {
  planned: "Planned Products",
  invoice: "Invoice Products",
}

const MODE_NOUN: Record<SectionMode, string> = {
  planned: "planned product",
  invoice: "invoice product",
}

// Mode accent: sky = the plan (Planned Products), emerald = the bill (Invoice Products).
const MODE_ACCENT: Record<SectionMode, string> = {
  planned: "border-sky-500/60 bg-sky-500/10 text-sky-800",
  invoice: "border-emerald-500/60 bg-emerald-500/10 text-emerald-800",
}

type PlannedController = ReturnType<typeof useTemplatePlannedProductsSection>
type InvoiceController = ReturnType<typeof useTemplateInvoiceProductsSection>

/**
 * The templates record view's single §2 section, toggled between two editable
 * grids by an inline stepper:
 *   - Planned Products (default, sky) — the repeatable job plan.
 *   - Invoice Products (emerald) — the products placed onto the invoice.
 *
 * Unlike the WO/imports toggle hosts, BOTH sides are independently editable, each
 * with its OWN controller + draft. Flipping preserves both drafts (nothing is
 * discarded), so the swap guard is switch-flavored and keyed to the ACTIVE side.
 */
export function TemplateProductsSection({
  planned,
  invoice,
}: {
  planned: PlannedController
  invoice: InvoiceController
}) {
  const [mode, setMode] = useState<SectionMode>("planned")

  // Flipping away from a dirty grid warns first, but the flip KEEPS the edits
  // (each controller holds its own draft, preserved across the toggle), so the
  // copy is switch-flavored. Guard only when the ACTIVE side is dirty — the
  // hidden side's dirtiness is preserved and doesn't gate the swap.
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
          <TemplatePlannedProductsGrid
            items={planned.items}
            editable={editable}
            onChangeField={planned.changeField}
            onChangeCategoryFilter={planned.changeCategoryFilter}
            onSetProductSnapshot={planned.setProductSnapshot}
            onSetUnit={planned.setUnit}
            onRemoveItem={planned.removeItem}
          />
        ) : (
          <TemplateInvoiceProductsGrid
            items={invoice.items}
            editable={editable}
            onChangeField={invoice.changeField}
            onChangeCategoryFilter={invoice.changeCategoryFilter}
            onSetProductSnapshot={invoice.setProductSnapshot}
            onSetUnit={invoice.setUnit}
            onRemoveItem={invoice.removeItem}
          />
        )}
      </RecordItemSection>

      <ConfirmDialog {...dialogProps} />
    </>
  )
}
