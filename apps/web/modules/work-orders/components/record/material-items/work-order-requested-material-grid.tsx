"use client"

import { NumberCell, TextCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import { WORK_ORDER_MATERIAL_ITEM_NOTES_MAX } from "@builders/domain"
import type {
  WorkOrderMaterialItemLocal,
  WorkOrderMaterialItemsSectionController,
} from "@/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section"
import {
  MaterialItemCreateAdjustmentButton,
  MaterialItemRemoveButton,
} from "./row-controls"

/**
 * "Requested Material" view (inbound): the customer-requested material items.
 * Product is freely editable (adjustments no longer link to a material item, so
 * a product change drifts nothing) and the same product may be added more than
 * once — there is no uniqueness rule. The old per-item "Assignments" total is
 * dropped: adjustments are decoupled, so a material item carries no linked sum.
 */
const REQUESTED_MATERIAL_COLUMNS: DataTableColumn<WorkOrderMaterialItemLocal>[] = [
  { key: "product", label: "Product", minWidth: 260, grow: 2 },
  { key: "quantity", label: "Quantity", width: 140, align: "end" },
  { key: "notes", label: "Notes", minWidth: 240, grow: 1.5 },
]

// Two row controls (delete + create-adjustment) share the leading gutter, so it
// runs wider than the single-icon default.
const REQUESTED_MATERIAL_GUTTER_WIDTH = 92

export function WorkOrderRequestedMaterialGrid({
  section,
  onCreateAdjustment,
}: {
  section: WorkOrderMaterialItemsSectionController
  /** Open the adjustment create modal pre-filtered to this row's product. */
  onCreateAdjustment: (item: WorkOrderMaterialItemLocal) => void
}) {
  const editable = !section.isSaving

  function renderCell(column: { key: string }, item: WorkOrderMaterialItemLocal) {
    switch (column.key) {
      case "product":
        return (
          <ProductCategoryPicker
            productId={item.productId || null}
            productLabel={item.productName || null}
            onProductChange={(next) => section.changeField(item.id, "productId", next ?? "")}
            onProductOptionSelected={(option) => section.setProductSnapshot(item.id, option)}
            categoryId={item.categoryFilterId}
            onCategoryChange={(next) => section.changeCategoryFilter(item.id, next)}
            productEditable={editable}
            categoryEditable={editable}
            showProductCategory
            ariaLabel="Material item product"
          />
        )
      case "quantity":
        return (
          <div className="flex w-full items-center gap-2">
            <div className="min-w-0 flex-1">
              <NumberCell
                editable={editable}
                value={item.quantity}
                onChange={(next) => section.changeField(item.id, "quantity", next)}
                placeholder="Quantity"
                ariaLabel="Material item quantity"
              />
            </div>
            <span className="shrink-0 text-[var(--foreground)]/60" aria-hidden="true">
              {item.sendUnitAbbrev || "—"}
            </span>
          </div>
        )
      case "notes":
        return (
          <TextCell
            editable={editable}
            value={item.notes}
            onChange={(next) => section.changeField(item.id, "notes", next)}
            placeholder="Notes"
            ariaLabel="Material item notes"
            maxLength={WORK_ORDER_MATERIAL_ITEM_NOTES_MAX}
          />
        )
      default:
        return null
    }
  }

  return (
    <DataTable<WorkOrderMaterialItemLocal>
      variant="editable"
      rows={section.items}
      columns={REQUESTED_MATERIAL_COLUMNS}
      empty="No material items yet."
      rowActionsWidth={REQUESTED_MATERIAL_GUTTER_WIDTH}
      rowActions={(item) => (
        <>
          <MaterialItemRemoveButton
            editable={editable}
            onClick={() => section.removeItem(item.id)}
          />
          <MaterialItemCreateAdjustmentButton
            enabled={Boolean(item.productId)}
            onClick={() => onCreateAdjustment(item)}
          />
        </>
      )}
      renderCell={renderCell}
    />
  )
}
