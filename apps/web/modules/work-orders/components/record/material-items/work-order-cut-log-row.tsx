"use client"

import { useEffect, useMemo, useState } from "react"
import type { WorkOrderItemPendingCutLogRow as PendingCutLogRow } from "@builders/domain"
import type { WorkOrderCutLogSectionState } from "@/modules/work-orders/controllers/use-work-order-cut-log-section-state"
import type { useWorkOrderCutLogVoid } from "@/modules/work-orders/controllers/use-work-order-cut-log-void"
import { listEligibleInventoryRequest } from "@/modules/work-orders/data/mutations"
import { StatusBadge } from "@/components/badges"
import {
  CheckboxCell,
  DropdownCell,
  NumberCell,
  RowActionButton,
  TextCell,
} from "@/components/cells"
import { ConfirmActionButton } from "@/components/features/confirm-action"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import type { GridRow } from "@/components/grid/contracts/grid-row"
import type { BadgeTone } from "@/components/badges/contracts/badge-tone"

type EligibleInventory = {
  id: string
  inventoryNumber: string
  itemNumber: string
  dyeLot: string
  remainingStock: string
  stockUnitAbbrev: string
  locationCode: string
}

type CutLogGridRow = GridRow &
  (
    | { kind: "draft"; clientId: string }
    | { kind: "server"; serverRow: PendingCutLogRow }
  )

function statusTone(status: PendingCutLogRow["status"]): BadgeTone {
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

const GRID_LAYOUT: GridLayout<CutLogGridRow> = {
  leadingControls: [{ key: "select", kind: "selection" as const, width: 40 }],
  dataColumns: [
    { key: "cutLogNumber", label: "Cut #", minWidth: 70, grow: 0 },
    { key: "inventory", label: "Inventory", minWidth: 220, grow: 1.5 },
    { key: "before", label: "Before", kind: "number", minWidth: 70, grow: 0, align: "end" },
    { key: "cut", label: "Cut", kind: "number", minWidth: 80, grow: 0, align: "end" },
    { key: "after", label: "After", kind: "number", minWidth: 70, grow: 0, align: "end" },
    { key: "coverage", label: "Coverage", kind: "number", minWidth: 80, grow: 0, align: "end" },
    { key: "status", label: "Status", kind: "status", minWidth: 100, grow: 0, align: "center" },
    { key: "finalCutSequence", label: "Final #", kind: "number", minWidth: 70, grow: 0, align: "end" },
    { key: "isWaste", label: "Waste", minWidth: 60, grow: 0, align: "center" },
    { key: "notes", label: "Notes", minWidth: 160, grow: 1 },
    { key: "created", label: "Created", minWidth: 90, grow: 0 },
    { key: "updated", label: "Updated", minWidth: 90, grow: 0 },
  ],
  trailingControls: [{ key: "actions", kind: "actions", width: 96 }],
}

export function WorkOrderCutLogRow({
  workOrderId,
  workOrderItemId,
  serverRows,
  cutLogState,
  selectedIds,
  onToggleSelected,
  canToggleSelection,
  isSelectionActive,
  isSavingPendingCuts,
  isFinalizingInFlight,
  voider,
}: {
  workOrderId: string
  workOrderItemId: string
  serverRows: PendingCutLogRow[]
  cutLogState: WorkOrderCutLogSectionState
  selectedIds: ReadonlySet<string>
  onToggleSelected: (cutLogId: string) => void
  canToggleSelection: boolean
  isSelectionActive: boolean
  isSavingPendingCuts: boolean
  isFinalizingInFlight: boolean
  voider: ReturnType<typeof useWorkOrderCutLogVoid>
}) {
  const local = cutLogState.getStateForWomi(workOrderItemId)

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

  const distinctLocationCodes = useMemo(
    () =>
      Array.from(
        new Set(eligibleInventory.map((i) => i.locationCode).filter(Boolean)),
      ).sort(),
    [eligibleInventory],
  )
  const locationOptions = useMemo(
    () => distinctLocationCodes.map((code) => ({ id: code, label: code })),
    [distinctLocationCodes],
  )
  const inventoryById = useMemo(() => {
    const map = new Map<string, EligibleInventory>()
    for (const inv of eligibleInventory) map.set(inv.id, inv)
    return map
  }, [eligibleInventory])

  function inventoriesForLocation(locationCode: string): EligibleInventory[] {
    if (!locationCode) return eligibleInventory
    return eligibleInventory.filter((inv) => inv.locationCode === locationCode)
  }

  const gridRows: CutLogGridRow[] = useMemo(() => {
    const drafts: CutLogGridRow[] = local.drafts.map((d) => ({
      id: d.clientId,
      kind: "draft" as const,
      clientId: d.clientId,
    }))
    const server: CutLogGridRow[] = serverRows.map((row) => ({
      id: row.id,
      kind: "server" as const,
      serverRow: row,
    }))
    return [...drafts, ...server]
  }, [local.drafts, serverRows])

  // Cells lock when the section is in a batch operation: selecting,
  // saving pending cuts, or finalizing. Per-row lock when the user has
  // queued this row for delete.
  const sectionBusy = isSelectionActive || isSavingPendingCuts || isFinalizingInFlight

  function renderServerCell(column: { key: string }, row: PendingCutLogRow) {
    const isPending = row.status === "PENDING"
    const update = local.updates[row.id]
    const isDeleted = !!local.deletes[row.id]
    const editableCell = isPending && !isDeleted && !sectionBusy
    const decoration = isDeleted ? "line-through opacity-60" : ""

    switch (column.key) {
      case "cutLogNumber":
        return <span className={decoration}>{row.cutLogNumber}</span>
      case "inventory": {
        const inv = inventoryById.get(row.inventoryId)
        const label = inv
          ? `${inv.inventoryNumber}${inv.locationCode ? ` · ${inv.locationCode}` : ""}`
          : row.inventoryId
        return <span className={`truncate ${decoration}`}>{label}</span>
      }
      case "before":
        return <span className={`tabular-nums ${decoration}`}>{row.before}</span>
      case "cut":
        if (editableCell) {
          return (
            <NumberCell
              editable={true}
              value={update?.cut ?? row.cut}
              onChange={(next) =>
                cutLogState.editServerRow(workOrderItemId, row, { cut: next })
              }
              ariaLabel="Cut amount"
            />
          )
        }
        return (
          <span className={`tabular-nums ${decoration}`}>{update?.cut ?? row.cut}</span>
        )
      case "after":
        return <span className={`tabular-nums ${decoration}`}>{row.after}</span>
      case "coverage":
        return (
          <span className={`tabular-nums ${decoration}`}>
            {row.coverageCut || "—"}
          </span>
        )
      case "status":
        return <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
      case "finalCutSequence":
        return <span className="tabular-nums">{row.finalCutSequence ?? "—"}</span>
      case "isWaste":
        if (editableCell) {
          return (
            <CheckboxCell
              editable={true}
              value={update?.isWaste ?? row.isWaste}
              onChange={(next) =>
                cutLogState.editServerRow(workOrderItemId, row, { isWaste: next })
              }
              ariaLabel="Cut log waste flag"
            />
          )
        }
        return (
          <CheckboxCell
            editable={false}
            value={update?.isWaste ?? row.isWaste}
            ariaLabel="Cut log waste flag"
          />
        )
      case "notes":
        if (editableCell) {
          return (
            <TextCell
              editable={true}
              value={update?.notes ?? row.notes}
              onChange={(next) =>
                cutLogState.editServerRow(workOrderItemId, row, { notes: next })
              }
              placeholder="Notes"
              ariaLabel="Cut log notes"
            />
          )
        }
        return (
          <span className={`truncate ${decoration}`}>{update?.notes ?? row.notes ?? "—"}</span>
        )
      case "created":
      case "updated":
        return <span className="text-[var(--foreground)]/55">—</span>
      default:
        return null
    }
  }

  function renderDraftCell(column: { key: string }, clientId: string) {
    const draft = local.drafts.find((d) => d.clientId === clientId)
    if (!draft) return null
    const filtered = inventoriesForLocation(draft.locationFilterCode)
    const inventoryOptions = filtered.map((inv) => ({
      id: inv.id,
      label: `${inv.inventoryNumber} · ${inv.remainingStock} ${inv.stockUnitAbbrev}${inv.locationCode ? ` · ${inv.locationCode}` : ""}`,
    }))
    const editableDraftCell = !sectionBusy

    switch (column.key) {
      case "cutLogNumber":
        return <span className="italic text-[var(--foreground)]/55">new</span>
      case "inventory":
        return (
          <div className="flex w-full flex-col gap-1">
            <DropdownCell
              editable={editableDraftCell}
              value={draft.locationFilterCode || null}
              onChange={(next) =>
                cutLogState.updateDraft(workOrderItemId, draft.clientId, {
                  locationFilterCode: next ?? "",
                })
              }
              options={locationOptions}
              allowClear
              placeholder="All locations"
              ariaLabel="Cut log location filter"
            />
            <DropdownCell
              editable={editableDraftCell}
              value={draft.inventoryId || null}
              onChange={(next) =>
                cutLogState.updateDraft(workOrderItemId, draft.clientId, {
                  inventoryId: next ?? "",
                })
              }
              options={inventoryOptions}
              placeholder={loadingInventory ? "Loading…" : "Pick inventory"}
              ariaLabel="Cut log inventory"
            />
          </div>
        )
      case "before":
        return <span className="tabular-nums text-[var(--foreground)]/55">—</span>
      case "cut":
        return (
          <NumberCell
            editable={editableDraftCell}
            value={draft.cut}
            onChange={(next) =>
              cutLogState.updateDraft(workOrderItemId, draft.clientId, { cut: next })
            }
            ariaLabel="Cut amount"
          />
        )
      case "after":
      case "coverage":
        return <span className="tabular-nums text-[var(--foreground)]/55">—</span>
      case "status":
        return <StatusBadge tone="warning">DRAFT</StatusBadge>
      case "finalCutSequence":
        return <span className="tabular-nums text-[var(--foreground)]/55">—</span>
      case "isWaste":
        return (
          <CheckboxCell
            editable={editableDraftCell}
            value={draft.isWaste}
            onChange={(next) =>
              cutLogState.updateDraft(workOrderItemId, draft.clientId, { isWaste: next })
            }
            ariaLabel="Cut log waste flag"
          />
        )
      case "notes":
        return (
          <TextCell
            editable={editableDraftCell}
            value={draft.notes}
            onChange={(next) =>
              cutLogState.updateDraft(workOrderItemId, draft.clientId, { notes: next })
            }
            placeholder="Notes"
            ariaLabel="Cut log notes"
          />
        )
      case "created":
      case "updated":
        return <span className="text-[var(--foreground)]/55">—</span>
      default:
        return null
    }
  }

  function renderCell(column: { key: string }, row: CutLogGridRow) {
    if (row.kind === "draft") return renderDraftCell(column, row.clientId)
    return renderServerCell(column, row.serverRow)
  }

  function renderControl(control: { key: string; kind: string }, row: CutLogGridRow) {
    if (control.kind === "selection") {
      // Drafts have client-only ids — not selectable for a batch action.
      // Per the always-visible-when-clean pattern (matches imports), the
      // checkbox renders for every PENDING server row whether the section
      // is dirty or clean; `editable` gates interaction via the shared
      // `canToggleSelection` signal.
      if (row.kind === "draft") return null
      const serverRow = row.serverRow
      if (serverRow.status !== "PENDING") return null
      return (
        <CheckboxCell
          editable={canToggleSelection}
          value={selectedIds.has(serverRow.id)}
          onChange={() => onToggleSelected(serverRow.id)}
          ariaLabel={`Select cut ${serverRow.cutLogNumber}`}
        />
      )
    }
    if (control.kind === "actions") {
      if (row.kind === "draft") {
        return (
          <RowActionButton
            label="Remove"
            ariaLabel="Remove draft cut"
            tone="destructive"
            editable={!sectionBusy}
            onClick={() => cutLogState.removeDraft(workOrderItemId, row.clientId)}
          />
        )
      }
      const serverRow = row.serverRow
      const isPending = serverRow.status === "PENDING"
      const isFinal = serverRow.status === "FINAL"
      const isDeleted = !!local.deletes[serverRow.id]

      if (isPending && !isDeleted) {
        return (
          <RowActionButton
            label="Remove"
            ariaLabel={`Remove cut ${serverRow.cutLogNumber}`}
            tone="destructive"
            editable={!sectionBusy}
            onClick={() => cutLogState.deleteServerRow(workOrderItemId, serverRow)}
          />
        )
      }
      if (isPending && isDeleted) {
        return (
          <RowActionButton
            label="Undo"
            ariaLabel={`Undo remove cut ${serverRow.cutLogNumber}`}
            tone="neutral"
            editable={!sectionBusy}
            onClick={() => cutLogState.undoDelete(workOrderItemId, serverRow.id)}
          />
        )
      }
      if (isFinal) {
        const isVoidingThisRow = voider.isVoiding && voider.voidingId === serverRow.id
        const voidEnabled = !sectionBusy && !voider.isVoiding
        return (
          <ConfirmActionButton
            label={isVoidingThisRow ? "Voiding…" : "Void"}
            ariaLabel={`Void cut ${serverRow.cutLogNumber}`}
            buttonTone="destructive"
            editable={voidEnabled}
            confirmTitle={`Void ${serverRow.cutLogNumber}?`}
            confirmMessage="Voiding will erase the cut value, coverage, cost, and freight on this cut log. The row stays as a void marker; before / after history is preserved. This cannot be undone."
            confirmLabel="Void cut log"
            pendingLabel="Voiding…"
            confirmTone="destructive"
            onConfirm={async () => {
              await voider.voidCutLog(serverRow.id)
            }}
          />
        )
      }
      return null
    }
    return null
  }

  return (
    <div className="space-y-3 rounded-md border border-[var(--panel-border)] bg-[var(--panel-border)]/5 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">Cut Logs</span>
        <span className="text-[var(--foreground)]/55">
          {serverRows.length} server rows · {local.drafts.length} drafts ·{" "}
          {Object.keys(local.updates).length} edits ·{" "}
          {Object.keys(local.deletes).length} pending deletes
        </span>
      </div>

      <Grid<CutLogGridRow>
        rows={gridRows}
        layout={GRID_LAYOUT}
        empty={<GridEmpty>No cut logs yet.</GridEmpty>}
        renderCell={renderCell}
        renderControl={renderControl}
      />

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          className="rounded border border-[var(--panel-border)] px-2 py-1 hover:bg-[var(--panel-border)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => cutLogState.addDraft(workOrderItemId)}
          disabled={sectionBusy}
        >
          + Add Pending Cut
        </button>
        {voider.error ? <span className="text-rose-700">{voider.error}</span> : null}
      </div>
    </div>
  )
}
