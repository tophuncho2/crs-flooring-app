"use client"

import { RecordItemSection } from "@/engines/record-view"
import type { useTemplatePlannedProductsSection } from "@/modules/templates/controllers/record/planned-products/use-template-planned-products-section"
import { TemplatePlannedProductsGrid } from "./planned-products/template-planned-products-grid"

type PlannedController = ReturnType<typeof useTemplatePlannedProductsSection>

/**
 * The templates record view's §2 section — the editable Planned Products grid.
 * Formerly a Planned⇄Invoice toggle host; the Invoice Products side was retired,
 * so this is now a single grid with no stepper.
 */
export function TemplateProductsSection({ planned }: { planned: PlannedController }) {
  const editable = !planned.isSaving
  const count = planned.items.length

  return (
    <RecordItemSection
      title="Planned Products"
      capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
      noticeMessage={planned.noticeMessage}
      noticeError={planned.noticeError}
      subHeader={{
        statusLeading: (
          <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
            {count} planned product{count === 1 ? "" : "s"}
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
            label: "+ Add Planned Product",
            kind: "add-row",
            onClick: planned.addItem,
            disabled: planned.isSaving,
          },
        ],
      }}
    >
      <TemplatePlannedProductsGrid
        items={planned.items}
        editable={editable}
        onChangeField={planned.changeField}
        onChangeQuantity={planned.changeQuantity}
        onChangeMargin={planned.changeMargin}
        onChangeSubtotal={planned.changeSubtotal}
        onChangeCategoryFilter={planned.changeCategoryFilter}
        onSetProductSnapshot={planned.setProductSnapshot}
        onSetUnit={planned.setUnit}
        onRemoveItem={planned.removeItem}
      />
    </RecordItemSection>
  )
}
