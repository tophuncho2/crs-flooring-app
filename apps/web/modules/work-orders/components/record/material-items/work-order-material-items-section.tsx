"use client"

import { Fragment, useState } from "react"
import { ActionsPanel } from "@/components/dropdowns/actions-panel"
import { StatusBadge } from "@/components/badges"
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

function statusTone(status: WorkOrderMaterialItemRow["status"]) {
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
  // Cut logs grouped by WOMI id. The dashboard loader passes the
  // current snapshot — re-fetch is the parent panel's responsibility.
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

  function findCategoryFilter(item: WorkOrderMaterialItemLocal): string | null {
    return item.categoryFilterId
  }
  function filterProducts(categoryFilterId: string | null): ProductOption[] {
    if (!categoryFilterId) return productOptions
    return productOptions.filter((p) => p.categoryId === categoryFilterId)
  }

  function findRowStatus(item: WorkOrderMaterialItemLocal) {
    const server = materialItems.find((row) => row.id === item.id)
    return server?.status ?? "IDLE"
  }

  return (
    <section className="space-y-3 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Material Items</h3>
        <ActionsPanel
          triggerLabel="Actions"
          triggerKind="primary"
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

      {section.error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-800">
          {section.error.message}
        </div>
      ) : null}
      {finalize.error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-800">
          {finalize.error}
        </div>
      ) : null}

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-[var(--panel-border)]">
            <th className="w-8"></th>
            <th className="px-2 py-1 text-left">Category</th>
            <th className="px-2 py-1 text-left">Product</th>
            <th className="px-2 py-1 text-right">Quantity</th>
            <th className="px-2 py-1 text-left">Notes</th>
            <th className="px-2 py-1 text-center">Status</th>
            <th className="w-16 px-2 py-1 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {section.items.map((item) => {
            const filtered = filterProducts(findCategoryFilter(item))
            const isExpanded = expandedRowIds.has(item.id)
            const cutLogs = cutLogsByWorkOrderItemId[item.id] ?? []
            const status = findRowStatus(item)
            return (
              <Fragment key={item.id}>
                <tr className="border-b border-[var(--panel-border)]/40">
                  <td className="px-2 py-1 text-center">
                    <button
                      type="button"
                      className="rounded border border-[var(--panel-border)] px-1 hover:bg-[var(--panel-border)]/10"
                      onClick={() => toggleExpanded(item.id)}
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? "−" : "+"}
                    </button>
                  </td>
                  <td className="px-2 py-1">
                    <select
                      className="rounded border border-[var(--panel-border)] px-1 text-xs"
                      value={item.categoryFilterId ?? ""}
                      onChange={(e) =>
                        section.changeCategoryFilter(item.id, e.target.value || null)
                      }
                    >
                      <option value="">All</option>
                      {categoryOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <select
                      className="w-full rounded border border-[var(--panel-border)] px-1 text-xs"
                      value={item.productId}
                      onChange={(e) => section.changeField(item.id, "productId", e.target.value)}
                    >
                      <option value="">Pick product</option>
                      {filtered.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1 text-right">
                    <input
                      className="w-20 rounded border border-[var(--panel-border)] px-1 text-right"
                      value={item.quantity}
                      onChange={(e) => section.changeField(item.id, "quantity", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      className="w-full rounded border border-[var(--panel-border)] px-1"
                      value={item.notes}
                      onChange={(e) => section.changeField(item.id, "notes", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <StatusBadge tone={statusTone(status)}>{status}</StatusBadge>
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button
                      type="button"
                      className="text-rose-600 hover:underline"
                      onClick={() => section.removeItem(item.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
                {isExpanded ? (
                  <tr className="bg-[var(--panel-border)]/5">
                    <td colSpan={7} className="px-3 py-2">
                      <WorkOrderCutLogRow
                        workOrderId={workOrder.id}
                        workOrderItemId={item.id}
                        serverRows={cutLogs}
                        finalizeController={finalize}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="rounded border border-[var(--panel-border)] px-2 py-1 text-xs hover:bg-[var(--panel-border)]/10"
          onClick={section.addItem}
        >
          + Add Material Item
        </button>
        {section.isDirty ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-[var(--panel-border)] px-2 py-1 text-xs hover:bg-[var(--panel-border)]/10"
              onClick={() => section.discard()}
              disabled={section.isSaving}
            >
              Discard
            </button>
            <button
              type="button"
              className="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              onClick={() => void section.save()}
              disabled={section.isSaving}
            >
              {section.isSaving ? "Saving…" : "Save Material Items"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
