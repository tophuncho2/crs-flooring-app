"use client"

import { NumberCell, TextCell } from "@/engines/record-view"
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

// Pure editable-table body for the Planned Products side. The RecordItemSection
// chrome (title, sub-header, save/discard/add) lives in the toggle host
// (`TemplateProductsSection`); this component is just the grid.
export function TemplatePlannedProductsGrid({
  items,
  editable,
  onChangeField,
  onChangeCategoryFilter,
  onSetProductSnapshot,
  onSetUnit,
  onRemoveItem,
}: {
  items: TemplatePlannedProductLocal[]
  editable: boolean
  onChangeField: (itemId: string, field: keyof TemplatePlannedProductLocal, value: string) => void
  onChangeCategoryFilter: (itemId: string, categoryId: string | null) => void
  onSetProductSnapshot: (itemId: string, option: ProductOption | null) => void
  onSetUnit: (itemId: string, option: UnitOfMeasureOption | null) => void
  onRemoveItem: (itemId: string) => void
}) {
  return (
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
  )
}
