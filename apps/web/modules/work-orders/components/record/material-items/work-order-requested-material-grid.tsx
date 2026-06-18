"use client"

import { NumberCell, TextCell } from "@/engines/record-view"
import { Grid, GridEmpty, type GridLayout } from "@/engines/record-view"
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
const REQUESTED_MATERIAL_LAYOUT: GridLayout<WorkOrderMaterialItemLocal> = {
  leadingControls: [
    { key: "remove", kind: "actions", width: 56 },
    { key: "create-adjustment", kind: "actions", width: 56 },
  ],
  dataColumns: [
    { key: "product", label: "Product", minWidth: 260, grow: 2 },
    { key: "quantity", label: "Quantity", kind: "number", minWidth: 120, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 240, grow: 1.5 },
  ],
}

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

  function renderControl(control: { key: string; kind: string }, item: WorkOrderMaterialItemLocal) {
    switch (control.key) {
      case "remove":
        return (
          <MaterialItemRemoveButton
            editable={editable}
            onClick={() => section.removeItem(item.id)}
          />
        )
      case "create-adjustment":
        return (
          <MaterialItemCreateAdjustmentButton
            enabled={Boolean(item.productId)}
            onClick={() => onCreateAdjustment(item)}
          />
        )
      default:
        return null
    }
  }

  return (
    <Grid<WorkOrderMaterialItemLocal>
      rows={section.items}
      layout={REQUESTED_MATERIAL_LAYOUT}
      empty={<GridEmpty>No material items yet.</GridEmpty>}
      renderCell={renderCell}
      renderControl={renderControl}
    />
  )
}
