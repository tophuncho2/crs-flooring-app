"use client"

import { Fragment, useCallback } from "react"
import { NumberCell, TextCell } from "@/components/cells"
import { useExpandableRowsToggle } from "@/controllers/expandable-rows"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { ExpandableRow, UnsavedParentMessage } from "@/components/grid/expandable-rows"
import { isLocalOnlyRecordRow } from "@/controllers/record/utils/record-row-ids"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
import type {
  CutLogRow,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import {
  useWorkOrderMaterialItemsSection,
  type WorkOrderMaterialItemLocal,
} from "@/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section"
import {
  CutLogEditPanel,
  useCutLogEditPanel,
  type CutLogPanelPatch,
} from "@/modules/cut-logs"
import { useInventoryHubSidePanel } from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryHubSidePanel } from "@/modules/inventory/components/side-panel/hub"
import { WorkOrderCutLogRow } from "./work-order-cut-log-row"
import { MaterialItemsSectionHeader } from "./material-items-section-header"
import {
  MaterialItemDuplicateButton,
  MaterialItemRemoveButton,
} from "./row-controls"

const WORK_ORDER_MATERIAL_ITEMS_LAYOUT: GridLayout<WorkOrderMaterialItemLocal> = {
  leadingControls: [{ key: "remove", kind: "actions", width: 116 }],
  dataColumns: [
    { key: "categoryFilter", label: "Category", minWidth: 140, grow: 0 },
    { key: "product", label: "Product", minWidth: 220, grow: 2 },
    { key: "quantity", label: "Quantity", kind: "number", minWidth: 180, grow: 0.5, align: "end" },
    { key: "notes", label: "Notes", minWidth: 200, grow: 1.5 },
  ],
}

export function WorkOrderMaterialItemsSection({
  workOrder,
  materialItems,
  cutLogsByWorkOrderItemId,
  publishMaterialItems,
  publishWorkOrder,
  publishCutLogPatch,
}: {
  workOrder: WorkOrderDetail
  materialItems: WorkOrderMaterialItemRow[]
  cutLogsByWorkOrderItemId: Record<string, CutLogRow[]>
  publishMaterialItems: (rows: WorkOrderMaterialItemRow[]) => void
  publishWorkOrder: (record: WorkOrderDetail) => void
  /** Apply a single-row patch to the parent's cut-log snapshot after a panel mutation. */
  publishCutLogPatch: (patch: CutLogPanelPatch) => void
}) {
  const section = useWorkOrderMaterialItemsSection({
    workOrder,
    materialItems,
    publishMaterialItems,
    publishWorkOrder,
  })

  const cutLogPanel = useCutLogEditPanel({
    scope: { kind: "work-order", workOrderId: workOrder.id },
    warehouseId: workOrder.warehouseId,
    canCreate: true,
    publish: publishCutLogPatch,
  })

  // Inventory hub panel for the "Hub view" jump on the cut-log edit
  // panel. No initial inventory — the panel opens on demand for whatever
  // cut log the user clicked; the hub fetches `InventoryDetail` via its
  // own query path. publishCutLogPatch is shared so a hub-driven cut-log
  // mutation also refreshes the WO-side snapshot through this panel.
  const inventoryHubPanel = useInventoryHubSidePanel({
    initialInventory: null,
    publishCutLogPatch,
  })

  const sectionBusy = section.isSaving

  const { allExpanded, toggleAll } = useExpandableRowsToggle()

  const editable = !sectionBusy

  const handleOpenEdit = useCallback(
    (workOrderItemId: string, cutLog: CutLogRow) => {
      // The WO-side data layer returns plain `CutLogRow` (the WO + WOMI
      // labels aren't joined in — the WO record view already has them in
      // scope). Hydrate the labels from in-scope state so the panel's
      // read-only cells stay populated symmetrically with the inv side.
      const item = section.items.find((i) => i.id === workOrderItemId)
      cutLogPanel.openPanel({
        mode: "edit",
        workOrderItemId,
        cutLog: {
          ...cutLog,
          workOrderNumber: workOrder.workOrderNumber,
          workOrderItemProductLabel: item?.productName || null,
          warehouseName: workOrder.warehouseName,
        },
      })
    },
    [cutLogPanel, section.items, workOrder.workOrderNumber, workOrder.warehouseName],
  )

  const handleCreateNew = useCallback(
    (workOrderItemId: string) => {
      // Cut logs scope inventory search to the parent material item's product —
      // a cut log can only reference inventory of the same product.
      const productId =
        section.items.find((item) => item.id === workOrderItemId)?.productId ?? ""
      cutLogPanel.openPanel({
        mode: "create",
        workOrderItemId,
        productId,
        workOrderNumber: workOrder.workOrderNumber,
        warehouseName: workOrder.warehouseName,
      })
    },
    [cutLogPanel, section.items, workOrder.workOrderNumber, workOrder.warehouseName],
  )

  const handleDuplicate = useCallback(
    (workOrderItemId: string, cutLog: CutLogRow) => {
      // UI-only "duplicate": open the create panel with the source row's
      // inventory item pre-selected. No use case fires — the operator must
      // still save the new cut log to materialize it (and only then does
      // inventory-balance recalculation run, via the normal create path).
      const productId =
        section.items.find((item) => item.id === workOrderItemId)?.productId ?? ""
      cutLogPanel.openPanel({
        mode: "create",
        workOrderItemId,
        productId,
        workOrderNumber: workOrder.workOrderNumber,
        warehouseName: workOrder.warehouseName,
        presetInventory: {
          id: cutLog.inventoryId,
          label: cutLog.inventoryItem,
          stockUnitAbbrev: cutLog.stockUnitAbbrev,
        },
      })
    },
    [cutLogPanel, section.items, workOrder.workOrderNumber, workOrder.warehouseName],
  )

  function renderParentCell(
    column: { key: string },
    item: WorkOrderMaterialItemLocal,
  ) {
    switch (column.key) {
      case "categoryFilter":
        return (
          <CategoryPicker
            value={item.categoryFilterId}
            onChange={(next) => section.changeCategoryFilter(item.id, next)}
            selectedLabel={null}
            disabled={!editable}
            placeholder="All categories"
            ariaLabel="Material item category filter"
          />
        )
      case "product":
        // Product is locked once the WOMI is saved (server enforces it
        // too — see WORK_ORDER_MATERIAL_ITEM_PRODUCT_LOCKED). Render the
        // picker only while the row is still a local-only draft;
        // saved rows show the snapshotted product name as static text.
        return isLocalOnlyRecordRow(item.id) ? (
          <ProductPicker
            value={item.productId || null}
            onChange={(next) => section.changeField(item.id, "productId", next ?? "")}
            onOptionSelected={(option) => section.setProductSnapshot(item.id, option)}
            categoryId={item.categoryFilterId}
            selectedLabel={item.productName || null}
            disabled={!editable}
            placeholder="Select product"
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
          <MaterialItemDuplicateButton
            editable={editable}
            onClick={() => section.duplicateItem(item.id)}
          />
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
          const cutLogs = cutLogsByWorkOrderItemId[row.id] ?? []
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
                      Save this material item to add cut logs.
                    </UnsavedParentMessage>
                  ) : (
                    <WorkOrderCutLogRow
                      workOrderItemId={row.id}
                      serverRows={cutLogs}
                      warehouseName={workOrder.warehouseName}
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

      <CutLogEditPanel
        controller={cutLogPanel}
        onOpenHubView={(inventoryId) => inventoryHubPanel.openForView(inventoryId)}
      />
      <InventoryHubSidePanel controller={inventoryHubPanel} />
    </div>
  )
}
