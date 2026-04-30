"use client"

import { Fragment, useCallback, useMemo, useState } from "react"
import { ActionHeader } from "@/components/headers"
import { StatusBadge } from "@/components/badges"
import { DropdownCell, NumberCell, RowActionButton, TextCell } from "@/components/cells"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { ExpandToggle, ExpandableRow } from "@/components/grid/expandable-rows"
import { SelectAllButton } from "@/components/features/select-batch"
import { useGatedBatchSelect } from "@/controllers/record/use-gated-batch-select"
import type {
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import type {
  CategoryOption,
  ProductOption,
} from "@/modules/work-orders/controllers/drafts"
import { useWorkOrderCutLogSectionState } from "@/modules/work-orders/controllers/use-work-order-cut-log-section-state"
import { useWorkOrderCutLogVoid } from "@/modules/work-orders/controllers/use-work-order-cut-log-void"
import {
  useWorkOrderMaterialItemsSection,
  type WorkOrderMaterialItemLocal,
} from "@/modules/work-orders/controllers/use-work-order-material-items-section"
import { finalizeWorkOrderCutLogBatchRequest } from "@/modules/work-orders/data/mutations"
import { WorkOrderCutLogRow } from "./work-order-cut-log-row"
import type { WorkOrderItemPendingCutLogRow as PendingCutLogRow } from "@builders/domain"
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
    case "SAVING_CUTS":
      return "processing"
    case "FINALIZING":
      return "processing"
    case "FAILED":
      return "error"
    default:
      return "muted"
  }
}

const isPendingCutLogRow = (row: PendingCutLogRow) => row.status === "PENDING"

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
  cutLogsByWorkOrderItemId: Record<string, PendingCutLogRow[]>
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
  const cutLogState = useWorkOrderCutLogSectionState({ workOrderId: workOrder.id })
  const voider = useWorkOrderCutLogVoid({ workOrderId: workOrder.id })

  // Flatten all WOMI cut-logs into one snapshot for the gated batch-select.
  // Eligibility (status === "PENDING") is enforced inside the hook via the
  // predicate; the hook returns `eligibleSelectedIds` filtered against the
  // latest snapshot so a row that drifted state since the user clicked it
  // is automatically excluded.
  const allCutLogs = useMemo(
    () => Object.values(cutLogsByWorkOrderItemId).flat(),
    [cutLogsByWorkOrderItemId],
  )

  const finalize = useGatedBatchSelect<PendingCutLogRow>({
    rows: allCutLogs,
    isEligible: isPendingCutLogRow,
    isSectionDirty: cutLogState.isAnyDirty || section.isDirty,
    isSectionBusy: cutLogState.isSavingPendingCuts || section.isSaving,
    performAction: useCallback(
      async (cutLogIds) => {
        await finalizeWorkOrderCutLogBatchRequest({
          workOrderId: workOrder.id,
          requestKey: crypto.randomUUID(),
          cutLogIds,
        })
      },
      [workOrder.id],
    ),
  })

  const isSelectionActive = finalize.isSelectionActive
  const isFinalizingInFlight = finalize.isFiring

  // Cell-level edit lock: any in-flight or selection state across the
  // entire section. Mirrors the lock signal threaded into the cut-log
  // row component for its per-cell editability.
  const sectionBusy =
    isSelectionActive ||
    cutLogState.isSavingPendingCuts ||
    isFinalizingInFlight ||
    section.isSaving

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

  function renderParentCell(
    column: { key: string },
    item: WorkOrderMaterialItemLocal,
  ) {
    switch (column.key) {
      case "categoryFilter":
        return (
          <DropdownCell
            editable={editable}
            value={item.categoryFilterId}
            onChange={(next) => section.changeCategoryFilter(item.id, next)}
            options={categoryCellOptions}
            allowClear
            placeholder="All categories"
            ariaLabel="Material item category filter"
          />
        )
      case "product": {
        const visibleProducts = item.categoryFilterId
          ? productOptions.filter(
              (p) => p.categoryId === item.categoryFilterId || p.id === item.productId,
            )
          : productOptions
        return (
          <DropdownCell
            editable={editable}
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

  const finalizeButtonLabel = isFinalizingInFlight
    ? "Finalizing…"
    : `Finalize Selected (${finalize.eligibleSelectedIds.length})`
  const canFinalize =
    !cutLogState.isAnyDirty &&
    !cutLogState.isSavingPendingCuts &&
    !isFinalizingInFlight &&
    !section.isSaving &&
    finalize.eligibleSelectedIds.length > 0

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <ActionHeader
        title="Material Items"
        summary={
          <span>
            {section.items.length} item{section.items.length === 1 ? "" : "s"}
            {finalize.selectedIds.size > 0
              ? ` · ${finalize.selectedIds.size} selected (${finalize.eligibleSelectedIds.length} eligible)`
              : ""}
          </span>
        }
        status={
          isSelectionActive && finalize.eligibleSelectedIds.length > 0
            ? {
                tone: "processing",
                label: "Ready to finalize",
                detail: "Worker will stamp before / after / finalCutSequence",
              }
            : undefined
        }
        extraActions={
          <SelectAllButton
            isSelectionActive={isSelectionActive}
            selectedCount={finalize.selectedIds.size}
            eligibleCount={finalize.eligibleCount}
            canSelect={finalize.canToggleSelection}
            onToggle={finalize.toggleAllEligible}
          />
        }
        actions={[
          {
            key: "add-mi",
            label: "+ Add Material Item",
            onClick: section.addItem,
            kind: "secondary",
            disabled: section.isSaving || isSelectionActive,
          },
          {
            key: "discard-mi",
            label: "Discard",
            onClick: () => section.discard(),
            kind: "secondary",
            disabled: !section.isDirty || section.isSaving || isSelectionActive,
          },
          {
            key: "save-mi",
            label: section.isSaving ? "Saving…" : "Save Material Items",
            onClick: () => void section.save(),
            kind: "primary",
            disabled:
              !section.isDirty || section.isSaving || section.hasConflict || isSelectionActive,
          },
          {
            key: "discard-cuts",
            label: "Discard Pending Cuts",
            onClick: cutLogState.discardAll,
            kind: "secondary",
            disabled:
              !cutLogState.isAnyDirty ||
              cutLogState.isSavingPendingCuts ||
              isSelectionActive,
          },
          {
            key: "save-cuts",
            label: cutLogState.isSavingPendingCuts ? "Saving…" : "Save Pending Cuts",
            onClick: () => void cutLogState.save(),
            kind: "primary",
            disabled:
              !cutLogState.isAnyDirty ||
              cutLogState.isSavingPendingCuts ||
              isSelectionActive,
          },
          {
            key: "finalize",
            label: finalizeButtonLabel,
            onClick: () => void finalize.fire(),
            kind: "primary",
            disabled: !canFinalize,
          },
        ]}
        message={section.noticeMessage}
        error={
          sectionError ||
          cutLogState.pendingSaveError ||
          finalize.error ||
          voider.error
            ? (sectionError ?? null) ||
              cutLogState.pendingSaveError ||
              finalize.error ||
              voider.error
            : null
        }
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
                      cutLogState={cutLogState}
                      selectedIds={finalize.selectedIds}
                      onToggleSelected={finalize.toggleSelected}
                      canToggleSelection={finalize.canToggleSelection}
                      isSelectionActive={isSelectionActive}
                      isSavingPendingCuts={cutLogState.isSavingPendingCuts}
                      isFinalizingInFlight={isFinalizingInFlight}
                      voider={voider}
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
