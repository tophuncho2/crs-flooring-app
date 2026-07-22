"use client"

import { RecordItemSection } from "@/engines/record-view"
import type { useTemplateProductsSection } from "@/modules/templates/controllers/record/products/use-template-products-section"
import { TemplatePlannedProductsGrid } from "./planned-products/template-planned-products-grid"
import { TemplateServiceItemsGrid } from "./service-items/template-service-items-grid"

type ProductsController = ReturnType<typeof useTemplateProductsSection>

/**
 * The templates record view's "products" section — TWO editable grids under ONE
 * RecordItemSection (one Save/Discard/dirty envelope, one atomic diff): planned
 * products + service / misc items. Both are fed by the same controller so the
 * single Save persists both tables in one transaction.
 */
export function TemplateProductsSection({ products }: { products: ProductsController }) {
  const editable = !products.isSaving
  const plannedCount = products.plannedItems.length
  const serviceCount = products.serviceItems.length

  return (
    <RecordItemSection
      title="Planned Products"
      capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
      noticeMessage={products.noticeMessage}
      noticeError={products.noticeError}
      subHeader={{
        statusLeading: (
          <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
            {plannedCount} planned product{plannedCount === 1 ? "" : "s"} · {serviceCount} service item
            {serviceCount === 1 ? "" : "s"}
          </span>
        ),
        isDirty: products.isDirty,
        isSaving: products.isSaving,
        hasConflict: products.hasConflict,
        onSave: () => void products.save(),
        onDiscard: () => products.discard(),
        saveLabel: "Save",
        savingLabel: "Saving...",
        discardLabel: "Discard",
        error: products.error ? products.error.message : null,
        actions: [
          {
            key: "add-planned",
            label: "+ Add Planned Product",
            kind: "add-row",
            onClick: products.addPlannedItem,
            disabled: products.isSaving,
          },
          {
            key: "add-service",
            label: "+ Add Service Item",
            kind: "add-row",
            onClick: products.addServiceItem,
            disabled: products.isSaving,
          },
        ],
      }}
    >
      <TemplatePlannedProductsGrid
        items={products.plannedItems}
        editable={editable}
        onChangeField={products.changePlannedField}
        onChangeQuantity={products.changePlannedQuantity}
        onToggleTaxed={products.changePlannedTaxed}
        onChangeCategoryFilter={products.changeCategoryFilter}
        onSetProductSnapshot={products.setProductSnapshot}
        onSetUnit={products.setPlannedUnit}
        onRemoveItem={products.removePlannedItem}
      />
      <TemplateServiceItemsGrid
        items={products.serviceItems}
        editable={editable}
        onChangeField={products.changeServiceField}
        onChangeQuantity={products.changeServiceQuantity}
        onToggleTaxed={products.changeServiceTaxed}
        onSetUnit={products.setServiceUnit}
        onRemoveItem={products.removeServiceItem}
      />
    </RecordItemSection>
  )
}
