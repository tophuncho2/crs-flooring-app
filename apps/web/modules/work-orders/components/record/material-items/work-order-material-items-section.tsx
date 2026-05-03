"use client"

import { Fragment, useCallback, useMemo, useRef, useState } from "react"
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
import { useFinalizeCutLogBatchSection } from "@/modules/work-orders/controllers/record/material-items/use-finalize-cut-log-batch-section"
import {
  useWorkOrderMaterialItemsSection,
  type WorkOrderMaterialItemLocal,
} from "@/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section"
import { WorkOrderCutLogRow } from "./work-order-cut-log-row"
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
}: {
  workOrder: WorkOrderDetail
  materialItems: WorkOrderMaterialItemRow[]
  cutLogsByWorkOrderItemId: Record<string, CutLogRow[]>
  productOptions: ProductOption[]
  categoryOptions: CategoryOption[]
  publishMaterialItems: (rows: WorkOrderMaterialItemRow[]) => void
  publishWorkOrder: (record: WorkOrderDetail) => void
}) {
  const section = useWorkOrderMaterialItemsSection({
    workOrder,
    materialItems,
    publishMaterialItems,
    publishWorkOrder,
  })

  // Flatten all WOMI cut-logs into one snapshot for the gated batch-select.
  // Eligibility (status === "PENDING") is enforced inside the finalize
  // controller; the controller returns `eligibleSelectedIds` filtered
  // against the latest snapshot so a row that drifted state since the
  // user clicked it is automatically excluded.
  //
  // The snapshot reflects SSR-loaded data only — newly-created cut logs
  // become finalize-eligible after a record refresh. Lifting per-WOMI
  // section state up to aggregate post-create rows is out of scope here
  // (the locked decision deferred speedy-finalize-refresh to the
  // finalize-hardening sweep).
  const allCutLogs = useMemo(
    () => Object.values(cutLogsByWorkOrderItemId).flat(),
    [cutLogsByWorkOrderItemId],
  )

  const finalize = useFinalizeCutLogBatchSection({
    workOrderId: workOrder.id,
    rows: allCutLogs,
    isSectionDirty: section.isDirty,
    isSectionBusy: section.isSaving,
  })

  const isSelectionActive = finalize.isSelectionActive
  const isFinalizingInFlight = finalize.isFiring

  // Cell-level edit lock for material items + per-WOMI cut-log row
  // affordances. Per-WOMI cut-log mutations have their own row-scoped
  // pending state; this section-level signal only fires when the parent
  // material-items mutation, finalize-batch mutation, or finalize
  // selection mode are active.
  const sectionBusy =
    isSelectionActive || isFinalizingInFlight || section.isSaving

  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set())
  function toggleExpanded(rowId: string) {
    setExpandedRowIds((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  // Aggregate cut-log mutation errors from each per-WOMI row hook so they
  // surface at the section header (canonical — see imports module). Each
  // WorkOrderCutLogRow reports its latest error via a per-WOMI onError
  // callback; we keep one message per WOMI keyed by item id and display
  // the most recent. Callbacks are cached so the row-side useEffect only
  // refires when its actual error changes.
  const [cutLogErrorByItemId, setCutLogErrorByItemId] = useState<Record<string, string>>({})
  const errorCallbacksRef = useRef(new Map<string, (message: string | null) => void>())
  const getCutLogErrorHandler = useCallback((itemId: string) => {
    const cached = errorCallbacksRef.current.get(itemId)
    if (cached) return cached
    const handler = (message: string | null) => {
      setCutLogErrorByItemId((current) => {
        if (message === null) {
          if (!(itemId in current)) return current
          const { [itemId]: _drop, ...rest } = current
          return rest
        }
        if (current[itemId] === message) return current
        return { ...current, [itemId]: message }
      })
    }
    errorCallbacksRef.current.set(itemId, handler)
    return handler
  }, [])
  const cutLogError = useMemo(() => {
    const messages = Object.values(cutLogErrorByItemId).filter((m): m is string => Boolean(m))
    return messages[messages.length - 1] ?? null
  }, [cutLogErrorByItemId])

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

  function renderParentCell(
    column: { key: string },
    item: WorkOrderMaterialItemLocal,
  ) {
    switch (column.key) {
      case "categoryFilter": {
        // For saved rows the explicit categoryFilterId is null (UI-only,
        // not persisted), so derive from the picked product's category.
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
        selectedCount={finalize.selectedIds.size}
        eligibleSelectedCount={finalize.eligibleSelectedIds.length}
        eligibleCount={finalize.eligibleCount}
        canToggleSelection={finalize.canToggleSelection}
        isSelectionActive={isSelectionActive}
        isFinalizingInFlight={isFinalizingInFlight}
        isSaving={section.isSaving}
        isDirty={section.isDirty}
        hasConflict={section.hasConflict}
        noticeMessage={section.noticeMessage}
        error={sectionError || finalize.error || cutLogError || null}
        onToggleSelectAll={finalize.toggleAllEligible}
        onFinalize={() => void finalize.fire()}
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
                childGroupLabel="Cut Logs"
                childCount={cutLogs.length}
                accentTone="sky"
              >
                {isExpanded ? (
                  <div className="px-4 py-3">
                    <WorkOrderCutLogRow
                      workOrderId={workOrder.id}
                      workOrderItemId={row.id}
                      serverRows={cutLogs}
                      selectedIds={finalize.selectedIds}
                      onToggleSelected={finalize.toggleSelected}
                      canToggleSelection={finalize.canToggleSelection}
                      isSectionBusy={sectionBusy}
                      onError={getCutLogErrorHandler(row.id)}
                    />
                  </div>
                ) : null}
              </ExpandableRow>
            </Fragment>
          )
        }}
      />
    </div>
  )
}
