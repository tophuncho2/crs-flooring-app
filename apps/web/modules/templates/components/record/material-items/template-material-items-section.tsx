"use client"

import { NumberCell, RecordItemSection, TextCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { RecordDeleteButton } from "@/engines/common"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import { UnitOfMeasurePicker } from "@/modules/unit-of-measures/components/picker/unit-of-measure-picker"
import {
  type ProductOption,
  type UnitOfMeasureOption,
  TEMPLATE_MATERIAL_ITEM_NOTES_MAX,
} from "@builders/domain"
import type { TemplateMaterialItemLocal } from "@/modules/templates/controllers/record/material-items/use-template-material-items-section"

const TEMPLATE_MATERIAL_ITEMS_COLUMNS: DataTableColumn<TemplateMaterialItemLocal>[] = [
  { key: "product", label: "Product", minWidth: 260, grow: 2 },
  { key: "quantity", label: "Quantity", width: 140, align: "end" },
  { key: "unit", label: "Unit", minWidth: 150, grow: 0.7 },
  { key: "notes", label: "Notes", minWidth: 240, grow: 1.5 },
]

export function TemplateMaterialItemsSection({
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
  items: TemplateMaterialItemLocal[]
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  error?: string | null
  noticeMessage?: string
  noticeError?: string
  onSave: () => void
  onDiscard: () => void
  onAddItem: () => void
  onChangeField: (itemId: string, field: keyof TemplateMaterialItemLocal, value: string) => void
  onChangeCategoryFilter: (itemId: string, categoryId: string | null) => void
  onSetProductSnapshot: (itemId: string, option: ProductOption | null) => void
  onSetUnit: (itemId: string, option: UnitOfMeasureOption | null) => void
  onRemoveItem: (itemId: string) => void
}) {
  const editable = !isSaving

  return (
    <RecordItemSection
      title="Material Items"
      // `item` sections default these off — unlock the managed Save/Discard path
      // and the add action so the toolbar renders the controls that used to live
      // in the ActionHeader.
      capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      subHeader={{
        statusLeading: (
          <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
            {items.length} item{items.length === 1 ? "" : "s"}
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
            label: "+ Add Material Item",
            kind: "add-row",
            onClick: onAddItem,
            disabled: isSaving,
          },
        ],
      }}
    >
      <DataTable<TemplateMaterialItemLocal>
        variant="editable"
        rows={items}
        columns={TEMPLATE_MATERIAL_ITEMS_COLUMNS}
        empty="No material items yet."
        rowActions={(item) => (
          <RecordDeleteButton
            ariaLabel="Remove material item"
            title={editable ? "Remove this material item" : "Saving..."}
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
                  ariaLabel="Material item product"
                />
              )
            case "unit":
              return (
                <UnitOfMeasurePicker
                  value={item.unitId || null}
                  selectedLabel={item.sendUnitName || null}
                  onChange={(id) => onChangeField(item.id, "unitId", id ?? "")}
                  onOptionSelected={(option) => onSetUnit(item.id, option)}
                  disabled={!editable}
                  ariaLabel="Material item unit"
                />
              )
            case "quantity":
              return (
                <NumberCell
                  editable={editable}
                  value={item.quantity}
                  onChange={(next) => onChangeField(item.id, "quantity", next)}
                  placeholder="Quantity"
                  ariaLabel="Material item quantity"
                />
              )
            case "notes":
              return (
                <TextCell
                  editable={editable}
                  value={item.notes}
                  onChange={(next) => onChangeField(item.id, "notes", next)}
                  placeholder="Notes"
                  ariaLabel="Material item notes"
                  maxLength={TEMPLATE_MATERIAL_ITEM_NOTES_MAX}
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
