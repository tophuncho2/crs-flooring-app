"use client"

import { Fragment, useMemo, useState } from "react"
import { ActionsPanel } from "@/components/dropdowns/actions-panel"
import { StatusBadge } from "@/components/badges"
import { DropdownCell, NumberCell, RowActionButton, TextCell } from "@/components/cells"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { ExpandToggle, ExpandableRow } from "@/components/grid/expandable-rows"
import type {
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import type {
  CategoryOption,
  ProductOption,
} from "@/modules/work-orders/controllers/drafts"
import { useWorkOrderCutLogFinalize } from "@/modules/work-orders/controllers/use-work-order-cut-log-finalize"
import {
  useWorkOrderMaterialItemsSection,
  type WorkOrderMaterialItemLocal,
} from "@/modules/work-orders/controllers/use-work-order-material-items-section"
import { WorkOrderCutLogRow } from "./work-order-cut-log-row"
import type { PendingCutLogRow } from "@/modules/work-orders/controllers/use-work-order-item-pending-cut-logs"
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
  const finalize = useWorkOrderCutLogFinalize({ workOrderId: workOrder.id })

  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set())
  function toggleExpanded(rowId: string) {
    setExpandedRowIds((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  const editable = !section.isSaving
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
          title={editable ? "Remove this material item" : "Saving..."}
          editable={editable}
          onClick={() => section.removeItem(item.id)}
        />
      )
    }
    return null
  }

  const sectionError = section.error ? section.error.message : null

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <div className="flex flex-col gap-3 border-b border-[var(--panel-border)] px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="truncate text-base font-semibold text-[var(--foreground)]">
            Material Items
          </div>
          <div className="text-sm text-[var(--foreground)]/75">
            {section.items.length} item{section.items.length === 1 ? "" : "s"}
          </div>
          {sectionError ? (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
              {sectionError}
            </div>
          ) : null}
          {finalize.error ? (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
              {finalize.error}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={section.addItem}
            disabled={section.isSaving}
            className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-sky-500/45 disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Add Material Item
          </button>
          <button
            type="button"
            onClick={() => section.discard()}
            disabled={!section.isDirty || section.isSaving}
            className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:border-sky-500/45 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => void section.save()}
            disabled={!section.isDirty || section.isSaving || section.hasConflict}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {section.isSaving ? "Saving Material Items..." : "Save Material Items"}
          </button>
          <ActionsPanel
            triggerLabel="Cut Log Actions"
            triggerKind="secondary"
            panelTitle="Cut Log Actions"
            ariaLabel="Cut log actions"
            actions={[
              {
                key: "save-pending",
                label: section.isSaving ? "Saving…" : "Save Pending Cuts (this section)",
                description:
                  "Saves any dirty material-item edits in this section. Per-WOMI cut-log saves are triggered from each expandable row.",
                onClick: () => void section.save(),
                disabled: !section.isDirty || section.isSaving,
              },
              finalize.isSelectionMode
                ? {
                    key: "finalize-submit",
                    label: finalize.isSubmitting
                      ? "Finalizing…"
                      : `Finalize ${finalize.selectedCount} Selected`,
                    description: "Sends the selected pending cut logs to finalize.",
                    onClick: () => void finalize.submit(),
                    disabled: finalize.selectedCount === 0 || finalize.isSubmitting,
                  }
                : {
                    key: "enter-finalize",
                    label: "Enter Finalize Mode",
                    description:
                      "Reveals checkboxes on PENDING cut-log rows so you can pick a batch to finalize.",
                    onClick: () => finalize.enterSelectionMode(),
                    disabled: false,
                  },
              finalize.isSelectionMode
                ? {
                    key: "finalize-cancel",
                    label: "Cancel Finalize",
                    description: "Exit finalize-selection mode.",
                    onClick: () => finalize.exitSelectionMode(),
                    disabled: false,
                  }
                : null,
            ].filter((a): a is NonNullable<typeof a> => a !== null)}
          />
        </div>
      </div>

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
                      finalizeController={finalize}
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
