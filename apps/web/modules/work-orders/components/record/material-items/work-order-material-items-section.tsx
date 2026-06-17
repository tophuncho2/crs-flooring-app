"use client"

import { Fragment, useCallback, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { InventoryRow } from "@builders/domain"
import { NumberCell, RecordItemSection, TextCell } from "@/engines/record-view"
import { useExpandableRowsToggle } from "@/engines/record-view"
import { Grid, GridEmpty, type GridLayout } from "@/engines/record-view"
import { ExpandableRow, UnsavedParentMessage } from "@/engines/record-view"
import { isLocalOnlyRecordRow } from "@/engines/record-view"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import {
  type EnrichedInventoryAdjustmentRow,
  type WorkOrderDetail,
  WORK_ORDER_MATERIAL_ITEM_NOTES_MAX,
  sumAssignmentQuantities,
} from "@builders/domain"
import type {
  WorkOrderMaterialItemLocal,
  WorkOrderMaterialItemsSectionController,
} from "@/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section"
import { buildCurrentRecordEntryPath, buildInventoryRecordHref } from "@/hooks/navigation"
import {
  AdjustmentCreateModal,
  inventoryRowFromAdjustment,
} from "@/modules/inventory/components/record/adjustments/adjustment-create-modal"
import { WorkOrderAdjustmentRow } from "./work-order-adjustment-row"
import { MaterialItemsExpandToggle } from "./toolbar-controls"
import { MaterialItemRemoveButton } from "./row-controls"

/**
 * An active "add adjustment" modal request for a single material item. `create`
 * opens an empty form; `duplicate` pre-selects the source row's inventory.
 */
type AdjustmentModalRequest = {
  workOrderItemId: string
  product: { id: string; name: string }
  materialItemNotes: string | null
  initialInventory: InventoryRow | null
}

const WORK_ORDER_MATERIAL_ITEMS_LAYOUT: GridLayout<WorkOrderMaterialItemLocal> = {
  leadingControls: [{ key: "remove", kind: "actions", width: 56 }],
  dataColumns: [
    { key: "product", label: "Product", minWidth: 260, grow: 2 },
    { key: "quantity", label: "Quantity", kind: "number", minWidth: 120, grow: 0, align: "end" },
    { key: "assignments", label: "Assignments", kind: "number", minWidth: 120, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 240, grow: 1.5 },
  ],
}

export function WorkOrderMaterialItemsSection({
  workOrder,
  adjustmentsByWorkOrderItemId,
  section,
}: {
  workOrder: WorkOrderDetail
  adjustmentsByWorkOrderItemId: Record<string, EnrichedInventoryAdjustmentRow[]>
  /** Section controller, instantiated in the panel and registered for dirty tracking. */
  section: WorkOrderMaterialItemsSectionController
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Editing an adjustment still opens it on the inventory record view; `returnTo`
  // brings the operator back to this work order afterwards. (Create/duplicate now
  // happen in-place via the modal below — no navigation.)
  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  // The in-place "add adjustment" modal request (create or duplicate), or null
  // when closed. Mounted conditionally so each open starts clean.
  const [modalRequest, setModalRequest] = useState<AdjustmentModalRequest | null>(null)

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
      // WO-create: open the in-place modal seeded with this material item's
      // product (the picker is filtered to it) and the WO link. The operator
      // picks the inventory item and fills the form without leaving the WO.
      const item = section.items.find((i) => i.id === workOrderItemId)
      if (!item?.productId) return
      setModalRequest({
        workOrderItemId,
        product: { id: item.productId, name: item.productName ?? "" },
        materialItemNotes: item.notes ?? null,
        initialInventory: null,
      })
    },
    [section.items],
  )

  const handleDuplicate = useCallback(
    (workOrderItemId: string, adjustment: EnrichedInventoryAdjustmentRow) => {
      // "Duplicate": open the same modal pre-selected with the source row's
      // inventory item (quantity stays blank). No use case fires — the operator
      // re-enters the quantity and saves to materialize it.
      const item = section.items.find((i) => i.id === workOrderItemId)
      if (!item?.productId) return
      // Only pre-seed the source row's inventory when it is for THIS material
      // item's product. A cross-product source would seed a mismatched roll
      // (the picker is product-locked but a direct pre-seed bypasses that filter,
      // and the server now rejects the mismatch), so force a fresh pick instead.
      const sourceMatchesProduct = adjustment.productId === item.productId
      setModalRequest({
        workOrderItemId,
        product: { id: item.productId, name: item.productName ?? "" },
        materialItemNotes: item.notes ?? null,
        initialInventory: sourceMatchesProduct ? inventoryRowFromAdjustment(adjustment) : null,
      })
    },
    [section.items],
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
      case "assignments": {
        // Total Assignments = Σ of this item's linked DEDUCTION adjustments'
        // quantity. Derived from the LIVE adjustment map (same source as the
        // product-lock above), so it stays in sync with the expandable rows and
        // updates without a page refresh. INCREASE rows can also link a WOMI but
        // are NOT assignments, so they're filtered out.
        const deductions = (adjustmentsByWorkOrderItemId[item.id] ?? []).filter(
          (adj) => adj.adjustmentType === "DEDUCTION",
        )
        const { quantity, stockUnitAbbrev } = sumAssignmentQuantities(deductions)
        return (
          <div className="flex w-full items-center justify-end gap-2">
            <span className="min-w-0 flex-1 text-right tabular-nums text-[var(--foreground)]/80">
              {quantity || "—"}
            </span>
            <span className="shrink-0 text-[var(--foreground)]/60" aria-hidden="true">
              {quantity ? stockUnitAbbrev || "—" : ""}
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

  return (
    <>
      <RecordItemSection
        title="Material Items"
        // `item` sections default these off — unlock the managed Save/Discard path
        // and the add action so the sub-header renders the controls that used to
        // live in the bespoke ActionHeader.
        capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
        noticeMessage={section.noticeMessage}
        noticeError={section.noticeError}
        subHeader={{
          // The show/hide-adjustments toggle sits in the actions cluster
          // (rendered left of the toolbar) as the furthest-left button; the
          // item-count badge stays in the right-aligned status cluster.
          actionsLeading: (
            <MaterialItemsExpandToggle
              itemsCount={section.items.length}
              allExpanded={allExpanded}
              onToggle={toggleAll}
            />
          ),
          statusLeading: (
            <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
              {section.items.length} item{section.items.length === 1 ? "" : "s"}
            </span>
          ),
          isDirty: section.isDirty,
          isSaving: section.isSaving,
          hasConflict: section.hasConflict,
          onSave: () => void section.save(),
          onDiscard: () => section.discard(),
          saveLabel: "Save Material Items",
          savingLabel: "Saving Material Items...",
          discardLabel: "Discard",
          error: section.error ? section.error.message : null,
          actions: [
            {
              key: "add",
              label: "+ Add Material Item",
              kind: "add-row",
              onClick: section.addItem,
              disabled: section.isSaving,
            },
          ],
        }}
      >
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
      </RecordItemSection>

      {modalRequest ? (
        <AdjustmentCreateModal
          workOrder={{
            id: workOrder.id,
            workOrderNumber: workOrder.workOrderNumber,
            warehouseId: workOrder.warehouseId,
            warehouseName: workOrder.warehouseName,
          }}
          workOrderItemId={modalRequest.workOrderItemId}
          product={modalRequest.product}
          materialItemNotes={modalRequest.materialItemNotes}
          initialInventory={modalRequest.initialInventory}
          onClose={() => setModalRequest(null)}
          onCreated={() => {
            // Reload the WO fresh so its per-WOMI adjustment set (+ Assignments
            // total and product-lock) reflect the new row, then close.
            setModalRequest(null)
            router.refresh()
          }}
        />
      ) : null}
    </>
  )
}
