"use client"

import { Fragment, useCallback, useMemo, useState } from "react"
import { StatusBadge } from "@/components/badges"
import { DropdownCell, NumberCell, RowActionButton, TextCell } from "@/components/cells"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { ExpandToggle, ExpandableRow } from "@/components/grid/expandable-rows"
import type {
  CutLogRow,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import type {
  CategoryOption,
  ProductOption,
} from "@/modules/work-orders/controllers/record/drafts"
import {
  useWorkOrderMaterialItemsSection,
  type WorkOrderMaterialItemLocal,
} from "@/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section"
import {
  useCutLogEditPanel,
  type CutLogPanelPatch,
} from "@/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel"
import { WorkOrderCutLogRow } from "./work-order-cut-log-row"
import { CutLogEditPanel } from "./cut-log-edit-panel"
import { MaterialItemsSectionHeader } from "./material-items-section-header"
import type { BadgeTone } from "@/components/badges/contracts/badge-tone"

const WORK_ORDER_MATERIAL_ITEMS_LAYOUT: GridLayout<WorkOrderMaterialItemLocal> = {
  leadingControls: [{ key: "expand", kind: "expand", width: 40 }],
  dataColumns: [
    { key: "categoryFilter", label: "Category", minWidth: 140, grow: 0 },
    { key: "product", label: "Product", minWidth: 220, grow: 2 },
    { key: "quantity", label: "Quantity", kind: "number", minWidth: 110, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 200, grow: 1.5 },
    { key: "status", label: "Status", kind: "status", minWidth: 110, grow: 0, align: "center" },
  ],
  trailingControls: [{ key: "remove", kind: "actions", width: 64 }],
}

function statusTone(status: WorkOrderMaterialItemRow["status"]): BadgeTone {
  switch (status) {
    case "FINALIZING":
      return "processing"
    case "FAILED":
      return "error"
    default:
      return "muted"
  }
}

export function WorkOrderMaterialItemsSection({
  workOrder,
  materialItems,
  cutLogsByWorkOrderItemId,
  productOptions,
  categoryOptions,
  publishMaterialItems,
  publishWorkOrder,
  publishCutLogPatch,
}: {
  workOrder: WorkOrderDetail
  materialItems: WorkOrderMaterialItemRow[]
  cutLogsByWorkOrderItemId: Record<string, CutLogRow[]>
  productOptions: ProductOption[]
  categoryOptions: CategoryOption[]
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
    workOrderId: workOrder.id,
    publish: publishCutLogPatch,
  })

  const sectionBusy = section.isSaving

  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set())
  function toggleExpanded(rowId: string) {
    setExpandedRowIds((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  const editable = !sectionBusy
  const categoryCellOptions = useMemo(
    () => categoryOptions.map((option) => ({ id: option.id, label: option.label })),
    [categoryOptions],
  )
  const productById = useMemo(() => {
    const map = new Map<string, ProductOption>()
    for (const product of productOptions) map.set(product.id, product)
    return map
  }, [productOptions])

  const serverStatusById = useMemo(() => {
    const map = new Map<string, WorkOrderMaterialItemRow["status"]>()
    for (const row of materialItems) map.set(row.id, row.status)
    return map
  }, [materialItems])

  function findRowStatus(itemId: string): WorkOrderMaterialItemRow["status"] {
    return serverStatusById.get(itemId) ?? "IDLE"
  }

  const handleOpenEdit = useCallback(
    (workOrderItemId: string, cutLog: CutLogRow) => {
      cutLogPanel.openPanel({ mode: "edit", workOrderItemId, cutLog })
    },
    [cutLogPanel],
  )

  const handleCreateNew = useCallback(
    (workOrderItemId: string) => {
      cutLogPanel.openPanel({ mode: "create", workOrderItemId })
    },
    [cutLogPanel],
  )

  function renderParentCell(
    column: { key: string },
    item: WorkOrderMaterialItemLocal,
  ) {
    switch (column.key) {
      case "categoryFilter": {
        const productCategoryId = item.productId
          ? productById.get(item.productId)?.categoryId ?? null
          : null
        const effectiveCategoryId = item.categoryFilterId ?? productCategoryId
        return (
          <DropdownCell
            editable={editable}
            value={effectiveCategoryId}
            onChange={(next) => section.changeCategoryFilter(item.id, next)}
            options={categoryCellOptions}
            allowClear
            placeholder="All categories"
            ariaLabel="Material item category filter"
          />
        )
      }
      case "product": {
        const productCategoryId = item.productId
          ? productById.get(item.productId)?.categoryId ?? null
          : null
        const effectiveCategoryId = item.categoryFilterId ?? productCategoryId
        const hasCategory = !!effectiveCategoryId
        const visibleProducts = hasCategory
          ? productOptions.filter(
              (p) => p.categoryId === effectiveCategoryId || p.id === item.productId,
            )
          : []
        return (
          <DropdownCell
            editable={editable && hasCategory}
            value={item.productId || null}
            onChange={(next) => section.changeField(item.id, "productId", next ?? "")}
            options={visibleProducts.map((p) => ({ id: p.id, label: p.label }))}
            placeholder="Select product"
            ariaLabel="Material item product"
          />
        )
      }
      case "quantity": {
        const unitAbbrev = productById.get(item.productId)?.sendUnitAbbrev ?? ""
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
      case "status": {
        const status = findRowStatus(item.id)
        return <StatusBadge tone={statusTone(status)}>{status}</StatusBadge>
      }
      default:
        return null
    }
  }

  function renderParentControl(
    control: { key: string; kind: string },
    item: WorkOrderMaterialItemLocal,
  ) {
    if (control.kind === "expand") {
      return (
        <ExpandToggle
          expanded={expandedRowIds.has(item.id)}
          onToggle={() => toggleExpanded(item.id)}
          ariaLabel={expandedRowIds.has(item.id) ? "Collapse cut logs" : "Expand cut logs"}
        />
      )
    }
    if (control.kind === "actions") {
      return (
        <RowActionButton
          label="✕"
          ariaLabel="Remove material item"
          tone="destructive"
          title={editable ? "Remove this material item" : "Locked while section is busy"}
          editable={editable}
          onClick={() => section.removeItem(item.id)}
        />
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
                      workOrderId={workOrder.id}
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
