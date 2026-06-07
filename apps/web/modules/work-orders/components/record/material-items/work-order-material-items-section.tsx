"use client"

import { Fragment, useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { NumberCell, TextCell } from "@/components/cells"
import { useExpandableRowsToggle } from "@/controllers/expandable-rows"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { ExpandableRow, UnsavedParentMessage } from "@/components/grid/expandable-rows"
import { isLocalOnlyRecordRow } from "@/engines/record-view"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import {
  type EnrichedInventoryAdjustmentRow,
  type WorkOrderDetail,
  type WorkOrderMaterialItemRow,
  WORK_ORDER_MATERIAL_ITEM_NOTES_MAX,
} from "@builders/domain"
import {
  useWorkOrderMaterialItemsSection,
  type WorkOrderMaterialItemLocal,
} from "@/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section"
import { buildCurrentRecordEntryPath, buildInventoryRecordHref } from "@/hooks/navigation"
import { WorkOrderAdjustmentRow } from "./work-order-adjustment-row"
import { MaterialItemsSectionHeader } from "./material-items-section-header"
import { MaterialItemRemoveButton } from "./row-controls"

const WORK_ORDER_MATERIAL_ITEMS_LAYOUT: GridLayout<WorkOrderMaterialItemLocal> = {
  leadingControls: [{ key: "remove", kind: "actions", width: 56 }],
  dataColumns: [
    { key: "product", label: "Product", minWidth: 220, grow: 2 },
    { key: "quantity", label: "Quantity", kind: "number", minWidth: 180, grow: 0.5, align: "end" },
    { key: "notes", label: "Notes", minWidth: 200, grow: 1.5 },
  ],
}

export function WorkOrderMaterialItemsSection({
  workOrder,
  materialItems,
  adjustmentsByWorkOrderItemId,
  publishMaterialItems,
  publishWorkOrder,
}: {
  workOrder: WorkOrderDetail
  materialItems: WorkOrderMaterialItemRow[]
  adjustmentsByWorkOrderItemId: Record<string, EnrichedInventoryAdjustmentRow[]>
  publishMaterialItems: (rows: WorkOrderMaterialItemRow[]) => void
  publishWorkOrder: (record: WorkOrderDetail) => void
}) {
  const section = useWorkOrderMaterialItemsSection({
    workOrder,
    materialItems,
    publishMaterialItems,
    publishWorkOrder,
  })

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Adjustments are created/edited on the inventory record view; `returnTo`
  // brings the operator back to this work order afterwards.
  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  const sectionBusy = section.isSaving

  const { allExpanded, toggleAll } = useExpandableRowsToggle()

  const editable = !sectionBusy

  const handleOpenEdit = useCallback(
    (_workOrderItemId: string, adjustment: EnrichedInventoryAdjustmentRow) => {
      // Edit lives on the inventory record view now: open that adjustment's
      // inventory record drilled into the adjustment (`?adjustment=<id>`), with
      // the header pickers seeded so the operator sees where they are.
      router.push(
        buildInventoryRecordHref({
          inventoryId: adjustment.inventoryId,
          inventoryLabel: adjustment.inventoryItem,
          warehouseId: adjustment.warehouseId,
          warehouseLabel: adjustment.warehouseName,
          adjustment: adjustment.id,
          returnTo,
        }),
      )
    },
    [router, returnTo],
  )

  const handleCreateNew = useCallback(
    (workOrderItemId: string) => {
      // WO-create: open the inventory record view with the WO's warehouse
      // pre-seeded and the WO link carried (product-filters the inventory
      // picker + pre-links the adjustment). The operator picks the inventory
      // item there; `?adjustment=new` opens the pre-linked create form once it
      // resolves.
      const item = section.items.find((i) => i.id === workOrderItemId)
      router.push(
        buildInventoryRecordHref({
          warehouseId: workOrder.warehouseId,
          warehouseLabel: workOrder.warehouseName,
          workOrderId: workOrder.id,
          workOrderItemId,
          workOrderLabel: `#${workOrder.workOrderNumber}`,
          productId: item?.productId ?? null,
          productLabel: item?.productName ?? null,
          materialItemLabel: item?.productName ?? null,
          materialItemNotes: item?.notes ?? null,
          adjustment: "new",
          returnTo,
        }),
      )
    },
    [router, returnTo, section.items, workOrder.id, workOrder.warehouseId, workOrder.warehouseName, workOrder.workOrderNumber],
  )

  const handleDuplicate = useCallback(
    (workOrderItemId: string, adjustment: EnrichedInventoryAdjustmentRow) => {
      // "Duplicate": open the source row's inventory record pre-selected, with
      // the WO link carried, and `?adjustment=new` so the pre-linked create form
      // opens seeded from that inventory item. No use case fires — the operator
      // re-enters the quantity and saves to materialize it.
      const item = section.items.find((i) => i.id === workOrderItemId)
      router.push(
        buildInventoryRecordHref({
          inventoryId: adjustment.inventoryId,
          inventoryLabel: adjustment.inventoryItem,
          warehouseId: adjustment.warehouseId,
          warehouseLabel: adjustment.warehouseName,
          workOrderId: workOrder.id,
          workOrderItemId,
          workOrderLabel: `#${workOrder.workOrderNumber}`,
          productId: item?.productId ?? null,
          productLabel: item?.productName ?? null,
          materialItemLabel: item?.productName ?? null,
          materialItemNotes: item?.notes ?? null,
          adjustment: "new",
          returnTo,
        }),
      )
    },
    [router, returnTo, section.items, workOrder.id, workOrder.workOrderNumber],
  )

  function renderParentCell(
    column: { key: string },
    item: WorkOrderMaterialItemLocal,
  ) {
    switch (column.key) {
      case "product": {
        // Product is editable until the item has linked inventory adjustments
        // (server enforces it too — see WORK_ORDER_MATERIAL_ITEM_PRODUCT_LOCKED).
        // Once it has adjustments the row only shows the product name as
        // static text and can only be deleted. New local rows never have any.
        //
        // Derive the lock from the LIVE adjustment map (mirrors the imports
        // "lock once it has children" pattern) rather than the server-baked
        // `item.hasInventoryAdjustments`, so the cell flips the instant a row
        // is saved — without a page refresh.
        const hasInventoryAdjustments =
          (adjustmentsByWorkOrderItemId[item.id] ?? []).length > 0
        return isLocalOnlyRecordRow(item.id) || !hasInventoryAdjustments ? (
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
        ) : (
          <div
            className="flex w-full items-center text-[var(--foreground)]/80"
            aria-readonly="true"
          >
            {item.productName || "—"}
          </div>
        )
      }
      case "quantity": {
        const unitAbbrev = item.sendUnitAbbrev
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
              {unitAbbrev || "—"}
            </span>
          </div>
        )
      }
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

  function renderParentControl(
    control: { key: string; kind: string },
    item: WorkOrderMaterialItemLocal,
  ) {
    if (control.kind === "actions") {
      return (
        <div className="flex items-center gap-1">
          <MaterialItemRemoveButton
            editable={editable}
            onClick={() => section.removeItem(item.id)}
          />
        </div>
      )
    }
    return null
  }

  const sectionError = section.error ? section.error.message : section.noticeError || null

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <MaterialItemsSectionHeader
        itemsCount={section.items.length}
        isSaving={section.isSaving}
        isDirty={section.isDirty}
        hasConflict={section.hasConflict}
        noticeMessage={section.noticeMessage}
        error={sectionError || null}
        allExpanded={allExpanded}
        onToggleAll={toggleAll}
        onDiscard={() => section.discard()}
        onSave={() => void section.save()}
        onAddItem={section.addItem}
      />

      <Grid<WorkOrderMaterialItemLocal>
        rows={section.items}
        layout={WORK_ORDER_MATERIAL_ITEMS_LAYOUT}
        empty={<GridEmpty>No material items yet.</GridEmpty>}
        renderRow={(row) => {
          const isExpanded = allExpanded
          const adjustments = adjustmentsByWorkOrderItemId[row.id] ?? []
          return (
            <Fragment>
              <ExpandableRow<WorkOrderMaterialItemLocal>
                parentRow={row}
                parentLayout={WORK_ORDER_MATERIAL_ITEMS_LAYOUT}
                expanded={isExpanded}
                renderParentCell={renderParentCell}
                renderParentControl={renderParentControl}
                accentTone="sky"
              >
                {isExpanded ? (
                  isLocalOnlyRecordRow(row.id) ? (
                    <UnsavedParentMessage>
                      Save this material item to add adjustments.
                    </UnsavedParentMessage>
                  ) : (
                    <WorkOrderAdjustmentRow
                      workOrderItemId={row.id}
                      serverRows={adjustments}
                      onOpenEdit={handleOpenEdit}
                      onCreateNew={handleCreateNew}
                      onDuplicate={handleDuplicate}
                      isSectionBusy={sectionBusy}
                    />
                  )
                ) : null}
              </ExpandableRow>
            </Fragment>
          )
        }}
      />
    </div>
  )
}
