"use client"

import { useEffect, useState } from "react"
import {
  type PendingCutLogRow,
  useWorkOrderItemPendingCutLogs,
} from "@/modules/work-orders/controllers/use-work-order-item-pending-cut-logs"
import { useWorkOrderCutLogVoid } from "@/modules/work-orders/controllers/use-work-order-cut-log-void"
import type { useWorkOrderCutLogFinalize } from "@/modules/work-orders/controllers/use-work-order-cut-log-finalize"
import { listEligibleInventoryRequest } from "@/modules/work-orders/data/mutations"
import { StatusBadge } from "@/components/badges"

type EligibleInventory = {
  id: string
  inventoryNumber: string
  itemNumber: string
  dyeLot: string
  remainingStock: string
  stockUnitAbbrev: string
  locationCode: string
}

function statusTone(status: PendingCutLogRow["status"]) {
  switch (status) {
    case "FINAL":
      return "success"
    case "VOID":
      return "muted"
    case "QUEUED":
      return "processing"
    case "PENDING":
      return "warning"
    default:
      return "default"
  }
}

/**
 * Expandable row inside a WOMI in the material-items section.
 *
 * Shows the cut-log table with editable cells for PENDING rows
 * (cut, isWaste, notes, inventory dropdown) plus a per-row location
 * filter that narrows the inventory dropdown to a chosen location.
 *
 * Coordinates with the parent ActionsPanel via:
 * - `pendingController` (this WOMI's pending diff state)
 * - `finalizeController` (WO-scoped batch select; renders a checkbox
 *   on PENDING rows when in selection mode)
 * - `voidController` (sync void on FINAL rows)
 */
export function WorkOrderCutLogRow({
  workOrderId,
  workOrderItemId,
  serverRows,
  finalizeController,
}: {
  workOrderId: string
  workOrderItemId: string
  serverRows: PendingCutLogRow[]
  finalizeController: ReturnType<typeof useWorkOrderCutLogFinalize>
}) {
  const pending = useWorkOrderItemPendingCutLogs({
    workOrderId,
    workOrderItemId,
    initialServerRows: serverRows,
  })
  const voider = useWorkOrderCutLogVoid({ workOrderId })

  const [eligibleInventory, setEligibleInventory] = useState<EligibleInventory[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadingInventory(true)
      try {
        const { inventories } = await listEligibleInventoryRequest({
          workOrderId,
          workOrderItemId,
        })
        if (!cancelled) setEligibleInventory(inventories)
      } catch {
        // Silently fail; user sees empty dropdown.
      } finally {
        if (!cancelled) setLoadingInventory(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [workOrderId, workOrderItemId])

  // Per-row location filter narrows the inventory dropdown to one
  // location code; the row's locationFilterCode lives in the local
  // draft / update state.
  function inventoriesForLocation(locationCode: string): EligibleInventory[] {
    if (!locationCode) return eligibleInventory
    return eligibleInventory.filter((inv) => inv.locationCode === locationCode)
  }

  const distinctLocationCodes = Array.from(
    new Set(eligibleInventory.map((i) => i.locationCode).filter(Boolean)),
  ).sort()

  return (
    <div className="space-y-3 rounded-md border border-[var(--panel-border)] bg-[var(--panel-border)]/5 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">Cut Logs</span>
        <span className="text-[var(--foreground)]/55">
          {serverRows.length} server rows · {pending.drafts.length} drafts ·{" "}
          {Object.keys(pending.updates).length} edits ·{" "}
          {Object.keys(pending.deletes).length} pending deletes
        </span>
      </div>

      {pending.error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-800">
          {pending.error}
        </div>
      ) : null}

      {/* Server rows */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-[var(--panel-border)]">
            {finalizeController.isSelectionMode ? <th className="w-8"></th> : null}
            <th className="px-2 py-1 text-left">Cut #</th>
            <th className="px-2 py-1 text-left">Inventory</th>
            <th className="px-2 py-1 text-right">Before</th>
            <th className="px-2 py-1 text-right">Cut</th>
            <th className="px-2 py-1 text-right">After</th>
            <th className="px-2 py-1 text-right">Coverage</th>
            <th className="px-2 py-1 text-center">Status</th>
            <th className="px-2 py-1 text-right">Final #</th>
            <th className="px-2 py-1 text-center">Waste</th>
            <th className="px-2 py-1 text-left">Notes</th>
            <th className="px-2 py-1 text-left">Created</th>
            <th className="px-2 py-1 text-left">Updated</th>
            <th className="w-16 px-2 py-1 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {serverRows.map((row) => {
            const isPending = row.status === "PENDING"
            const isFinal = row.status === "FINAL"
            const update = pending.updates[row.id]
            const isDeleted = !!pending.deletes[row.id]
            const cellBg = isDeleted ? "bg-rose-500/5 line-through opacity-60" : ""
            return (
              <tr key={row.id} className={`border-b border-[var(--panel-border)]/40 ${cellBg}`}>
                {finalizeController.isSelectionMode ? (
                  <td className="px-2 py-1">
                    {isPending ? (
                      <input
                        type="checkbox"
                        checked={finalizeController.selectedIds.has(row.id)}
                        onChange={(e) =>
                          finalizeController.setSelected(row.id, e.target.checked)
                        }
                      />
                    ) : null}
                  </td>
                ) : null}
                <td className="px-2 py-1">{row.cutLogNumber}</td>
                <td className="px-2 py-1">{row.inventoryId}</td>
                <td className="px-2 py-1 text-right tabular-nums">{row.before}</td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {isPending && !isDeleted ? (
                    <input
                      className="w-16 rounded border border-[var(--panel-border)] px-1 text-right"
                      value={update?.cut ?? row.cut}
                      onChange={(e) => pending.editServerRow(row, { cut: e.target.value })}
                    />
                  ) : (
                    row.cut
                  )}
                </td>
                <td className="px-2 py-1 text-right tabular-nums">{row.after}</td>
                <td className="px-2 py-1 text-right tabular-nums">{row.coverageCut || "—"}</td>
                <td className="px-2 py-1 text-center">
                  <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
                </td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {row.finalCutSequence ?? "—"}
                </td>
                <td className="px-2 py-1 text-center">
                  {isPending && !isDeleted ? (
                    <input
                      type="checkbox"
                      checked={update?.isWaste ?? row.isWaste}
                      onChange={(e) =>
                        pending.editServerRow(row, { isWaste: e.target.checked })
                      }
                    />
                  ) : row.isWaste ? (
                    "☑"
                  ) : (
                    "☐"
                  )}
                </td>
                <td className="px-2 py-1">
                  {isPending && !isDeleted ? (
                    <input
                      className="w-32 rounded border border-[var(--panel-border)] px-1"
                      value={update?.notes ?? row.notes}
                      onChange={(e) => pending.editServerRow(row, { notes: e.target.value })}
                    />
                  ) : (
                    row.notes || "—"
                  )}
                </td>
                <td className="px-2 py-1">—</td>
                <td className="px-2 py-1">—</td>
                <td className="px-2 py-1 text-right">
                  {isPending && !isDeleted ? (
                    <button
                      type="button"
                      className="text-rose-600 hover:underline"
                      onClick={() => pending.deleteServerRow(row)}
                    >
                      Remove
                    </button>
                  ) : isPending && isDeleted ? (
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={() => pending.undoDelete(row.id)}
                    >
                      Undo
                    </button>
                  ) : isFinal ? (
                    <button
                      type="button"
                      className="text-rose-600 hover:underline disabled:opacity-50"
                      disabled={voider.isVoiding && voider.voidingId === row.id}
                      onClick={() => void voider.voidCutLog(row.id)}
                    >
                      Void
                    </button>
                  ) : null}
                </td>
              </tr>
            )
          })}

          {/* Draft rows (newly added, not yet saved) */}
          {pending.drafts.map((draft) => {
            const filtered = inventoriesForLocation(draft.locationFilterCode)
            return (
              <tr key={draft.clientId} className="border-b border-[var(--panel-border)]/40 bg-emerald-500/5">
                {finalizeController.isSelectionMode ? <td></td> : null}
                <td className="px-2 py-1 italic text-[var(--foreground)]/55">new</td>
                <td className="px-2 py-1">
                  <div className="flex flex-col gap-1">
                    <select
                      className="rounded border border-[var(--panel-border)] px-1 text-xs"
                      value={draft.locationFilterCode}
                      onChange={(e) =>
                        pending.updateDraft(draft.clientId, { locationFilterCode: e.target.value })
                      }
                    >
                      <option value="">All locations</option>
                      {distinctLocationCodes.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded border border-[var(--panel-border)] px-1 text-xs"
                      value={draft.inventoryId}
                      onChange={(e) =>
                        pending.updateDraft(draft.clientId, { inventoryId: e.target.value })
                      }
                    >
                      <option value="">{loadingInventory ? "Loading…" : "Pick inventory"}</option>
                      {filtered.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.inventoryNumber} · {inv.remainingStock} {inv.stockUnitAbbrev}
                          {inv.locationCode ? ` · ${inv.locationCode}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-2 py-1 text-right">—</td>
                <td className="px-2 py-1 text-right">
                  <input
                    className="w-16 rounded border border-[var(--panel-border)] px-1 text-right"
                    value={draft.cut}
                    onChange={(e) => pending.updateDraft(draft.clientId, { cut: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1 text-right">—</td>
                <td className="px-2 py-1 text-right">—</td>
                <td className="px-2 py-1 text-center">
                  <StatusBadge tone="warning">DRAFT</StatusBadge>
                </td>
                <td className="px-2 py-1 text-right">—</td>
                <td className="px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={draft.isWaste}
                    onChange={(e) =>
                      pending.updateDraft(draft.clientId, { isWaste: e.target.checked })
                    }
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-32 rounded border border-[var(--panel-border)] px-1"
                    value={draft.notes}
                    onChange={(e) => pending.updateDraft(draft.clientId, { notes: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1">—</td>
                <td className="px-2 py-1">—</td>
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    className="text-rose-600 hover:underline"
                    onClick={() => pending.removeDraft(draft.clientId)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          className="rounded border border-[var(--panel-border)] px-2 py-1 hover:bg-[var(--panel-border)]/10"
          onClick={pending.addDraft}
        >
          + Add Pending Cut
        </button>
        {voider.error ? (
          <span className="text-rose-700">{voider.error}</span>
        ) : null}
      </div>

      {/* Expose pending controller's save/discard via a slim row of controls.
          The "Save Pending Cuts" action in the section ActionsPanel calls
          this controller's save() — these inline buttons are a backup. */}
      {pending.isDirty ? (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded border border-[var(--panel-border)] px-2 py-1 text-xs hover:bg-[var(--panel-border)]/10"
            onClick={pending.discard}
            disabled={pending.isSaving}
          >
            Discard
          </button>
          <button
            type="button"
            className="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            onClick={() => void pending.save()}
            disabled={pending.isSaving}
          >
            {pending.isSaving ? "Saving…" : "Save Pending Cuts"}
          </button>
        </div>
      ) : null}
    </div>
  )
}
