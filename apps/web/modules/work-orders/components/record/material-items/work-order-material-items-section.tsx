"use client"

import { Fragment, useCallback } from "react"
import { NumberCell, TextCell } from "@/components/cells"
import { useExpandableRowsToggle } from "@/controllers/expandable-rows"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { ExpandableRow, UnsavedParentMessage } from "@/components/grid/expandable-rows"
import { isLocalOnlyRecordRow } from "@/controllers/record/utils/record-row-ids"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import {
  type EnrichedInventoryAdjustmentRow,
  type InventoryAdjustmentRow,
  type WorkOrderDetail,
  type WorkOrderMaterialItemRow,
  WORK_ORDER_MATERIAL_ITEM_NOTES_MAX,
} from "@builders/domain"
import {
  useWorkOrderMaterialItemsSection,
  type WorkOrderMaterialItemLocal,
} from "@/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section"
import {
  AdjustmentEditPanel,
  useAdjustmentEditPanel,
  type AdjustmentPanelPatch,
} from "@/modules/adjustments"
import { useInventoryHubSidePanel } from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryHubSidePanel } from "@/modules/inventory/components/side-panel/hub"
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
  publishAdjustmentPatch,
}: {
  workOrder: WorkOrderDetail
  materialItems: WorkOrderMaterialItemRow[]
  adjustmentsByWorkOrderItemId: Record<string, EnrichedInventoryAdjustmentRow[]>
  publishMaterialItems: (rows: WorkOrderMaterialItemRow[]) => void
  publishWorkOrder: (record: WorkOrderDetail) => void
  /** Apply a single-row patch to the parent's adjustment snapshot after a panel mutation. */
  publishAdjustmentPatch: (patch: AdjustmentPanelPatch) => void
}) {
  const section = useWorkOrderMaterialItemsSection({
    workOrder,
    materialItems,
    publishMaterialItems,
    publishWorkOrder,
  })

  // Inventory hub panel for the "Hub view" jump on the adjustment edit
  // panel. No initial inventory — the panel opens on demand for whatever
  // adjustment the user clicked; the hub fetches `InventoryDetail` via its
  // own query path. publishAdjustmentPatch is shared so a hub-driven adjustment
  // mutation also refreshes the WO-side snapshot through this panel.
  const inventoryHubPanel = useInventoryHubSidePanel({
    initialInventory: null,
    publishAdjustmentPatch,
  })

  // Route a successful adjustment create from the WO panel directly into
  // the inventory-hub adjustment edit panel — same surface the WO edit
  // affordance uses (`handleOpenEdit`). The adjustment panel closes itself;
  // the hub picks up the new row hydrated with WO/WOMI/warehouse labels
  // so the read-only header summary matches the inv-side experience.
  const handleAdjustmentCreated = useCallback(
    (adjustment: InventoryAdjustmentRow, workOrderItemId: string | null) => {
      // WO-side create always carries a WOMI id; the null case is the manual
      // (inventory-hub) variant, which never routes through this section.
      if (!workOrderItemId) return
      const item = section.items.find((i) => i.id === workOrderItemId)
      inventoryHubPanel.openForAdjustmentEdit({
        ...adjustment,
        workOrderItemId,
        workOrderNumber: workOrder.workOrderNumber,
        workOrderItemProductLabel: item?.productName || null,
        warehouseName: workOrder.warehouseName,
      })
    },
    [
      inventoryHubPanel,
      section.items,
      workOrder.workOrderNumber,
      workOrder.warehouseName,
    ],
  )

  const adjustmentPanel = useAdjustmentEditPanel({
    scope: { kind: "work-order", workOrderId: workOrder.id },
    warehouseId: workOrder.warehouseId,
    canCreate: true,
    publish: publishAdjustmentPatch,
    onCreated: handleAdjustmentCreated,
  })

  const sectionBusy = section.isSaving

  const { allExpanded, toggleAll } = useExpandableRowsToggle()

  const editable = !sectionBusy

  const handleOpenEdit = useCallback(
    (_workOrderItemId: string, adjustment: EnrichedInventoryAdjustmentRow) => {
      // Editing is hub-driven (mirrors the inventory record view's row
      // click) — opens the InventoryHubSidePanel directly at
      // section-edit-adjustment mode. The WO-side read is now enriched, so the
      // row already carries WO/WOMI/warehouse labels for the hub's header.
      inventoryHubPanel.openForAdjustmentEdit(adjustment)
    },
    [inventoryHubPanel],
  )

  const handleCreateNew = useCallback(
    (workOrderItemId: string) => {
      // Adjustments scope inventory search to the parent material item's product —
      // a adjustment can only reference inventory of the same product.
      const productId =
        section.items.find((item) => item.id === workOrderItemId)?.productId ?? ""
      adjustmentPanel.openPanel({
        mode: "create",
        variant: "cut",
        workOrderItemId,
        productId,
        workOrderNumber: workOrder.workOrderNumber,
        warehouseName: workOrder.warehouseName,
      })
    },
    [adjustmentPanel, section.items, workOrder.workOrderNumber, workOrder.warehouseName],
  )

  const handleDuplicate = useCallback(
    (workOrderItemId: string, adjustment: EnrichedInventoryAdjustmentRow) => {
      // UI-only "duplicate": open the create panel with the source row's
      // inventory item pre-selected. No use case fires — the operator must
      // still save the new adjustment to materialize it (and only then does
      // inventory-balance recalculation run, via the normal create path).
      const productId =
        section.items.find((item) => item.id === workOrderItemId)?.productId ?? ""
      adjustmentPanel.openPanel({
        mode: "create",
        variant: "cut",
        workOrderItemId,
        productId,
        workOrderNumber: workOrder.workOrderNumber,
        warehouseName: workOrder.warehouseName,
        presetInventory: {
          id: adjustment.inventoryId,
          label: adjustment.inventoryItem,
          stockUnitAbbrev: adjustment.stockUnitAbbrev,
        },
      })
    },
    [adjustmentPanel, section.items, workOrder.workOrderNumber, workOrder.warehouseName],
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

      <AdjustmentEditPanel
        controller={adjustmentPanel}
        onOpenInventory={(id) => inventoryHubPanel.openForView(id)}
      />
      <InventoryHubSidePanel controller={inventoryHubPanel} />
    </div>
  )
}
