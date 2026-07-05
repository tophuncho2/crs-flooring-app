"use client"

import {
  ConfirmDialog,
  RecordItemSection,
  useRecordSectionToggle,
  type RecordSectionToggleSide,
} from "@/engines/record-view"
import type { useTemplatePlannedProductsSection } from "@/modules/templates/controllers/record/planned-products/use-template-planned-products-section"
import type { useTemplateInvoiceProductsSection } from "@/modules/templates/controllers/record/invoice-products/use-template-invoice-products-section"
import { TemplatePlannedProductsGrid } from "./planned-products/template-planned-products-grid"
import { TemplateInvoiceProductsGrid } from "./invoice-products/template-invoice-products-grid"

/** Which side the single §2 section is showing. Planned Products is default. */
type SectionMode = "planned" | "invoice"

const MODE_NOUN: Record<SectionMode, string> = {
  planned: "planned product",
  invoice: "invoice product",
}

type PlannedController = ReturnType<typeof useTemplatePlannedProductsSection>
type InvoiceController = ReturnType<typeof useTemplateInvoiceProductsSection>

/**
 * The templates record view's single §2 section, toggled between two editable
 * grids by an inline stepper:
 *   - Planned Products (default, sky) — the repeatable job plan.
 *   - Invoice Products (emerald) — the products placed onto the invoice.
 *
 * BOTH sides are independently editable, each with its OWN controller + draft.
 * Toggling away from a dirty side confirms, then DISCARDS that side's draft (the
 * shared section-toggle contract) — so the hidden side is always clean.
 */
export function TemplateProductsSection({
  planned,
  invoice,
}: {
  planned: PlannedController
  invoice: InvoiceController
}) {
  // Mode accent: sky = the plan (Planned Products), emerald = the bill (Invoice Products).
  const sides: readonly [
    RecordSectionToggleSide<SectionMode>,
    RecordSectionToggleSide<SectionMode>,
  ] = [
    {
      key: "planned",
      label: "Planned Products",
      accent: "border-sky-500/60 bg-sky-500/10 text-sky-800",
      isDirty: planned.isDirty,
      onDiscard: planned.discard,
    },
    {
      key: "invoice",
      label: "Invoice Products",
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
