"use client"

import { NumberCell, TextCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { RecordDeleteButton } from "@/engines/common"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import { UnitOfMeasurePicker } from "@/modules/unit-of-measures/components/picker/unit-of-measure-picker"
import {
  formatMoney,
  type ProductOption,
  type UnitOfMeasureOption,
  TEMPLATE_PLANNED_PRODUCT_NOTES_MAX,
} from "@builders/domain"
import type { TemplatePlannedProductLocal } from "@/modules/templates/controllers/record/planned-products/use-template-planned-products-section"

const TEMPLATE_PLANNED_PRODUCTS_COLUMNS: DataTableColumn<TemplatePlannedProductLocal>[] = [
  // Product carries the wide 360 floor + sole grow; Quantity, Unit, Cost sit
  // right of it, Notes is the pinned tail. Cost is a read-only live join off the
  // product.
  { key: "product", label: "Product", minWidth: 360, grow: 1 },
  { key: "quantity", label: "Quantity", width: 130, align: "end" },
  { key: "unit", label: "Unit", width: 140 },
  { key: "cost", label: "Cost", width: 120, align: "end" },
  { key: "notes", label: "Notes", width: 280 },
]

// Pure editable-table body for the Planned Products side. The RecordItemSection
// chrome (title, sub-header, save/discard/add) lives in the toggle host
// (`TemplateProductsSection`); this component is just the grid.
export function TemplatePlannedProductsGrid({
  items,
  editable,
  onChangeField,
  onChangeQuantity,
  onChangeCategoryFilter,
  onSetProductSnapshot,
  onSetUnit,
  onRemoveItem,
}: {
  items: TemplatePlannedProductLocal[]
  editable: boolean
  onChangeField: (itemId: string, field: keyof TemplatePlannedProductLocal, value: string) => void
  onChangeQuantity: (itemId: string, value: string) => void
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
                onChange={(next) => onChangeQuantity(item.id, next)}
                placeholder="Quantity"
                ariaLabel="Planned product quantity"
              />
            )
          case "cost":
            // Live cost read-joined off the product — read-only. "—" when the
            // product has no cost set.
            return (
              <NumberCell
                editable={false}
                align="end"
                value={item.productCost ? formatMoney(item.productCost) : "—"}
                ariaLabel="Planned product cost (from product)"
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
