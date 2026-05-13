"use client"

import { Fragment, useCallback, useState } from "react"
import { NumberCell, RowActionButton, TextCell } from "@/components/cells"
import { DuplicateRowButton } from "@/components/features/duplicate-row"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { ExpandableRow } from "@/components/grid/expandable-rows"
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
import { WorkOrderCutLogRow } from "./work-order-cut-log-row"
import { MaterialItemsSectionHeader } from "./material-items-section-header"

const WORK_ORDER_MATERIAL_ITEMS_LAYOUT: GridLayout<WorkOrderMaterialItemLocal> = {
  dataColumns: [
    { key: "categoryFilter", label: "Category", minWidth: 140, grow: 0 },
    { key: "product", label: "Product", minWidth: 220, grow: 2 },
    { key: "quantity", label: "Quantity", kind: "number", minWidth: 110, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 200, grow: 1.5 },
  ],
  trailingControls: [{ key: "remove", kind: "actions", width: 116 }],
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

  const sectionBusy = section.isSaving

  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set())
  const allExpanded =
    section.items.length > 0 && expandedRowIds.size === section.items.length
  const toggleAll = useCallback(() => {
    setExpandedRowIds(
      allExpanded ? new Set() : new Set(section.items.map((item) => item.id)),
    )
  }, [allExpanded, section.items])

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
        },
      })
    },
    [cutLogPanel, section.items, workOrder.workOrderNumber],
  )

  const handleCreateNew = useCallback(
    (workOrderItemId: string) => {
      // Cut logs scope inventory search to the parent material item's product —
      // a cut log can only reference inventory of the same product.
      const productId =
        section.items.find((item) => item.id === workOrderItemId)?.productId ?? ""
      cutLogPanel.openPanel({ mode: "create", workOrderItemId, productId })
    },
    [cutLogPanel, section.items],
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
        return (
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
          <DuplicateRowButton
            ariaLabel="Duplicate material item"
            title={editable ? "Duplicate this material item" : "Locked while section is busy"}
            editable={editable}
            onClick={() => section.duplicateItem(item.id)}
          />
          <RowActionButton
            label="✕"
            ariaLabel="Remove material item"
            tone="destructive"
            title={editable ? "Remove this material item" : "Locked while section is busy"}
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
          const isExpanded = expandedRowIds.has(row.id)
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
                  <div className="px-4 py-3">
                    <WorkOrderCutLogRow
                      workOrderItemId={row.id}
                      serverRows={cutLogs}
                      onOpenEdit={handleOpenEdit}
                      onCreateNew={handleCreateNew}
                      isSectionBusy={sectionBusy}
                    />
                  </div>
                ) : null}
              </ExpandableRow>
            </Fragment>
          )
        }}
      />

      <CutLogEditPanel controller={cutLogPanel} />
    </div>
  )
}
