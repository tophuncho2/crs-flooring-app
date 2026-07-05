"use client"

import { MoneyCell, NumberCell, TextCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { RecordDeleteButton } from "@/engines/common"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import { UnitOfMeasurePicker } from "@/modules/unit-of-measures/components/picker/unit-of-measure-picker"
import {
  type ProductOption,
  type UnitOfMeasureOption,
  TEMPLATE_INVOICE_PRODUCT_NOTES_MAX,
} from "@builders/domain"
import type { TemplateInvoiceProductLocal } from "@/modules/templates/controllers/record/invoice-products/use-template-invoice-products-section"

const TEMPLATE_INVOICE_PRODUCTS_COLUMNS: DataTableColumn<TemplateInvoiceProductLocal>[] = [
  // At the panel's real width the table sits at its min-width floor, so grow
  // weights never kick in — the FLOORS are what render. Product carries a wide
  // 360 floor (and is the sole grow column for wide panels), pushing Quantity /
  // Cost / Unit (all pinned) right as a fixed group; Notes is a pinned 320 tail.
  // Mirrors the WO Requested Material grid (plus this grid's own Cost column).
  { key: "product", label: "Product", minWidth: 360, grow: 1 },
  { key: "cost", label: "Cost", width: 140, align: "end" },
  { key: "quantity", label: "Quantity", width: 140, align: "end" },
  { key: "unit", label: "Unit", width: 150 },
  { key: "notes", label: "Notes", width: 320 },
]

// Pure editable-table body for the Invoice Products side. A structural clone of
// the planned grid (separate so it can diverge — e.g. a cost column — in a later
// pass). The RecordItemSection chrome lives in the toggle host.
export function TemplateInvoiceProductsGrid({
  items,
  editable,
  onChangeField,
  onChangeCategoryFilter,
  onSetProductSnapshot,
  onSetUnit,
  onRemoveItem,
}: {
  items: TemplateInvoiceProductLocal[]
  editable: boolean
  onChangeField: (itemId: string, field: keyof TemplateInvoiceProductLocal, value: string) => void
  onChangeCategoryFilter: (itemId: string, categoryId: string | null) => void
  onSetProductSnapshot: (itemId: string, option: ProductOption | null) => void
  onSetUnit: (itemId: string, option: UnitOfMeasureOption | null) => void
  onRemoveItem: (itemId: string) => void
}) {
  return (
    <DataTable<TemplateInvoiceProductLocal>
      variant="editable"
      rows={items}
      columns={TEMPLATE_INVOICE_PRODUCTS_COLUMNS}
      empty="No invoice products yet."
      rowActions={(item) => (
        <RecordDeleteButton
          ariaLabel="Remove invoice product"
          title={editable ? "Remove this invoice product" : "Saving..."}
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
                ariaLabel="Invoice product"
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
                ariaLabel="Invoice product unit"
              />
            )
          case "quantity":
            return (
              <NumberCell
                editable={editable}
                value={item.quantity}
                onChange={(next) => onChangeField(item.id, "quantity", next)}
                placeholder="Quantity"
                ariaLabel="Invoice product quantity"
              />
            )
          case "cost":
            return (
              <MoneyCell
                editable={editable}
                value={item.cost}
                onChange={(next) => onChangeField(item.id, "cost", next)}
                ariaLabel="Invoice product cost"
              />
            )
          case "notes":
            return (
              <TextCell
                editable={editable}
                value={item.notes}
                onChange={(next) => onChangeField(item.id, "notes", next)}
                placeholder="Notes"
                ariaLabel="Invoice product notes"
                maxLength={TEMPLATE_INVOICE_PRODUCT_NOTES_MAX}
              />
            )
          default:
            return null
        }
      }}
    />
  )
}
