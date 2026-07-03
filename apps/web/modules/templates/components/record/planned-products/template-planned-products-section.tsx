"use client"

import { NumberCell, RecordItemSection, TextCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { RecordDeleteButton } from "@/engines/common"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import { UnitOfMeasurePicker } from "@/modules/unit-of-measures/components/picker/unit-of-measure-picker"
import {
  type ProductOption,
  type UnitOfMeasureOption,
  TEMPLATE_PLANNED_PRODUCT_NOTES_MAX,
} from "@builders/domain"
import type { TemplatePlannedProductLocal } from "@/modules/templates/controllers/record/planned-products/use-template-planned-products-section"

const TEMPLATE_PLANNED_PRODUCTS_COLUMNS: DataTableColumn<TemplatePlannedProductLocal>[] = [
  { key: "product", label: "Product", minWidth: 260, grow: 2 },
  { key: "quantity", label: "Quantity", width: 140, align: "end" },
  { key: "unit", label: "Unit", minWidth: 150, grow: 0.7 },
  { key: "notes", label: "Notes", minWidth: 240, grow: 1.5 },
]

export function TemplatePlannedProductsSection({
  items,
  isDirty,
  isSaving,
  hasConflict,
  error,
  noticeMessage,
  noticeError,
  onSave,
  onDiscard,
  onAddItem,
  onChangeField,
  onChangeCategoryFilter,
  onSetProductSnapshot,
  onSetUnit,
  onRemoveItem,
}: {
  items: TemplatePlannedProductLocal[]
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  error?: string | null
  noticeMessage?: string
  noticeError?: string
  onSave: () => void
  onDiscard: () => void
  onAddItem: () => void
  onChangeField: (itemId: string, field: keyof TemplatePlannedProductLocal, value: string) => void
  onChangeCategoryFilter: (itemId: string, categoryId: string | null) => void
  onSetProductSnapshot: (itemId: string, option: ProductOption | null) => void
  onSetUnit: (itemId: string, option: UnitOfMeasureOption | null) => void
  onRemoveItem: (itemId: string) => void
}) {
  const editable = !isSaving

  return (
    <RecordItemSection
      title="Planned Products"
      // `item` sections default these off — unlock the managed Save/Discard path
      // and the add action so the toolbar renders the controls that used to live
      // in the ActionHeader.
      capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      subHeader={{
        statusLeading: (
          <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
            {items.length} planned product{items.length === 1 ? "" : "s"}
          </span>
        ),
        isDirty,
        isSaving,
        hasConflict,
        onSave,
        onDiscard,
        saveLabel: "Save",
        savingLabel: "Saving...",
        discardLabel: "Discard",
        error,
        actions: [
          {
            key: "add",
            label: "+ Add Planned Product",
            kind: "add-row",
            onClick: onAddItem,
            disabled: isSaving,
          },
        ],
      }}
    >
      <DataTable<TemplatePlannedProductLocal>
        variant="editable"
        rows={items}
        columns={TEMPLATE_PLANNED_PRODUCTS_COLUMNS}
        empty="No planned products yet."
        rowActions={(item) => (
          <RecordDeleteButton
            ariaLabel="Remove planned product"
            title={editable ? "Remove this planned product" : "Saving..."}
            disabled={!editable}
            onClick={() => onRemoveItem(item.id)}
          />
        )}
        renderCell={(column, item) => {
          switch (column.key) {
            case "product":
              return (
                <ProductCategoryPicker
                  productId={item.productId || null}
                  productLabel={item.productName || null}
                  onProductChange={(next) => onChangeField(item.id, "productId", next ?? "")}
                  onProductOptionSelected={(option) => onSetProductSnapshot(item.id, option)}
                  categoryId={item.categoryFilterId}
                  onCategoryChange={(next) => onChangeCategoryFilter(item.id, next)}
                  productEditable={editable}
                  categoryEditable={editable}
                  showProductCategory
                  categoryLabel={item.categoryFilterName}
                  ariaLabel="Planned product"
                />
              )
            case "unit":
              return (
                <UnitOfMeasurePicker
                  value={item.unitId || null}
                  selectedLabel={item.unitName || null}
                  onChange={(id) => onChangeField(item.id, "unitId", id ?? "")}
                  onOptionSelected={(option) => onSetUnit(item.id, option)}
                  disabled={!editable}
                  ariaLabel="Planned product unit"
                />
              )
            case "quantity":
              return (
                <NumberCell
                  editable={editable}
                  value={item.quantity}
                  onChange={(next) => onChangeField(item.id, "quantity", next)}
                  placeholder="Quantity"
                  ariaLabel="Planned product quantity"
                />
              )
            case "notes":
              return (
                <TextCell
                  editable={editable}
                  value={item.notes}
                  onChange={(next) => onChangeField(item.id, "notes", next)}
                  placeholder="Notes"
                  ariaLabel="Planned product notes"
                  maxLength={TEMPLATE_PLANNED_PRODUCT_NOTES_MAX}
                />
              )
            default:
              return null
          }
        }}
      />
    </RecordItemSection>
  )
}
