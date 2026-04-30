"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import {
  type PendingCutLogRow,
  useWorkOrderItemPendingCutLogs,
} from "@/modules/work-orders/controllers/use-work-order-item-pending-cut-logs"
import { useWorkOrderCutLogVoid } from "@/modules/work-orders/controllers/use-work-order-cut-log-void"
import type { useWorkOrderCutLogFinalize } from "@/modules/work-orders/controllers/use-work-order-cut-log-finalize"
import { listEligibleInventoryRequest } from "@/modules/work-orders/data/mutations"
import { StatusBadge } from "@/components/badges"
import {
  CheckboxCell,
  DropdownCell,
  NumberCell,
  RowActionButton,
  TextCell,
} from "@/components/cells"
import { Grid, GridEmpty, ScopedRow, type GridLayout } from "@/components/grid"
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

type CutLogServerGridRow = GridRow & {
  serverRow: PendingCutLogRow
}

type CutLogDraftGridRow = GridRow & {
  clientId: string
}

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

function buildServerLayout(showSelection: boolean): GridLayout<CutLogServerGridRow> {
  const leadingControls = showSelection
    ? [{ key: "select", kind: "selection" as const, width: 40 }]
    : undefined
  return {
    leadingControls,
    dataColumns: [
      { key: "cutLogNumber", label: "Cut #", minWidth: 70, grow: 0 },
      { key: "inventory", label: "Inventory", minWidth: 140, grow: 1 },
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
    trailingControls: [{ key: "actions", kind: "actions", width: 72 }],
  }
}

function buildDraftLayout(showSelection: boolean): GridLayout<CutLogDraftGridRow> {
  const leadingControls = showSelection
    ? [{ key: "select", kind: "selection" as const, width: 40 }]
    : undefined
  return {
    leadingControls,
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
    trailingControls: [{ key: "actions", kind: "actions", width: 72 }],
  }
}

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

  const showSelection = finalizeController.isSelectionMode
  const serverLayout = useMemo(() => buildServerLayout(showSelection), [showSelection])
  const draftLayout = useMemo(() => buildDraftLayout(showSelection), [showSelection])

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

  const serverGridRows: CutLogServerGridRow[] = useMemo(
    () => serverRows.map((row) => ({ id: row.id, serverRow: row })),
    [serverRows],
  )
  const draftGridRows: CutLogDraftGridRow[] = useMemo(
    () => pending.drafts.map((d) => ({ id: d.clientId, clientId: d.clientId })),
    [pending.drafts],
  )

  function renderServerCell(
    column: { key: string },
    gridRow: CutLogServerGridRow,
  ) {
    const row = gridRow.serverRow
    const isPending = row.status === "PENDING"
    const update = pending.updates[row.id]
    const isDeleted = !!pending.deletes[row.id]
    const editableCell = isPending && !isDeleted

    switch (column.key) {
      case "cutLogNumber":
        return (
          <span className={isDeleted ? "line-through opacity-60" : ""}>
            {row.cutLogNumber}
          </span>
        )
      case "inventory": {
        const inv = inventoryById.get(row.inventoryId)
        const label = inv
          ? `${inv.inventoryNumber}${inv.locationCode ? ` · ${inv.locationCode}` : ""}`
          : row.inventoryId
        return (
          <span className={`truncate ${isDeleted ? "line-through opacity-60" : ""}`}>
            {label}
          </span>
        )
      }
      case "before":
        return (
          <span className={`tabular-nums ${isDeleted ? "line-through opacity-60" : ""}`}>
            {row.before}
          </span>
        )
      case "cut":
        if (editableCell) {
          return (
            <NumberCell
              editable={true}
              value={update?.cut ?? row.cut}
              onChange={(next) => pending.editServerRow(row, { cut: next })}
              ariaLabel="Cut amount"
            />
          )
        }
        return (
          <span className={`tabular-nums ${isDeleted ? "line-through opacity-60" : ""}`}>
            {row.cut}
          </span>
        )
      case "after":
        return (
          <span className={`tabular-nums ${isDeleted ? "line-through opacity-60" : ""}`}>
            {row.after}
          </span>
        )
      case "coverage":
        return (
          <span className={`tabular-nums ${isDeleted ? "line-through opacity-60" : ""}`}>
            {row.coverageCut || "—"}
          </span>
        )
      case "status":
        return <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
      case "finalCutSequence":
        return (
          <span className="tabular-nums">{row.finalCutSequence ?? "—"}</span>
        )
      case "isWaste":
        if (editableCell) {
          return (
            <CheckboxCell
              editable={true}
              value={update?.isWaste ?? row.isWaste}
              onChange={(next) => pending.editServerRow(row, { isWaste: next })}
              ariaLabel="Cut log waste flag"
            />
          )
        }
        return (
          <CheckboxCell
            editable={false}
            value={row.isWaste}
            ariaLabel="Cut log waste flag"
          />
        )
      case "notes":
        if (editableCell) {
          return (
            <TextCell
              editable={true}
              value={update?.notes ?? row.notes}
              onChange={(next) => pending.editServerRow(row, { notes: next })}
              placeholder="Notes"
              ariaLabel="Cut log notes"
            />
          )
        }
        return (
          <span className={`truncate ${isDeleted ? "line-through opacity-60" : ""}`}>
            {row.notes || "—"}
          </span>
        )
      case "created":
      case "updated":
        return <span className="text-[var(--foreground)]/55">—</span>
      default:
        return null
    }
  }

  function renderServerControl(
    control: { key: string; kind: string },
    gridRow: CutLogServerGridRow,
  ) {
    const row = gridRow.serverRow
    const isPending = row.status === "PENDING"
    const isFinal = row.status === "FINAL"
    const isDeleted = !!pending.deletes[row.id]

    if (control.kind === "selection") {
      if (!isPending) return null
      return (
        <input
          type="checkbox"
          checked={finalizeController.selectedIds.has(row.id)}
          onChange={(e) => finalizeController.setSelected(row.id, e.target.checked)}
          aria-label={`Select cut ${row.cutLogNumber}`}
          className="h-4 w-4 cursor-pointer rounded border-[var(--panel-border)] text-sky-600 focus:ring-1 focus:ring-sky-500/40"
        />
      )
    }
    if (control.kind === "actions") {
      if (isPending && !isDeleted) {
        return (
          <RowActionButton
            label="Remove"
            ariaLabel={`Remove cut ${row.cutLogNumber}`}
            tone="destructive"
            editable={true}
            onClick={() => pending.deleteServerRow(row)}
          />
        )
      }
      if (isPending && isDeleted) {
        return (
          <RowActionButton
            label="Undo"
            ariaLabel={`Undo remove cut ${row.cutLogNumber}`}
            tone="neutral"
            editable={true}
            onClick={() => pending.undoDelete(row.id)}
          />
        )
      }
      if (isFinal) {
        const isVoidingThisRow = voider.isVoiding && voider.voidingId === row.id
        return (
          <RowActionButton
            label={isVoidingThisRow ? "Voiding…" : "Void"}
            ariaLabel={`Void cut ${row.cutLogNumber}`}
            tone="destructive"
            editable={!isVoidingThisRow}
            onClick={() => void voider.voidCutLog(row.id)}
          />
        )
      }
      return null
    }
    return null
  }

  function renderDraftCell(column: { key: string }, gridRow: CutLogDraftGridRow) {
    const draft = pending.drafts.find((d) => d.clientId === gridRow.clientId)
    if (!draft) return null
    const filtered = inventoriesForLocation(draft.locationFilterCode)
    const inventoryOptions = filtered.map((inv) => ({
      id: inv.id,
      label: `${inv.inventoryNumber} · ${inv.remainingStock} ${inv.stockUnitAbbrev}${inv.locationCode ? ` · ${inv.locationCode}` : ""}`,
    }))

    switch (column.key) {
      case "cutLogNumber":
        return <span className="italic text-[var(--foreground)]/55">new</span>
      case "inventory":
        return (
          <div className="flex w-full flex-col gap-1">
            <DropdownCell
              editable={true}
              value={draft.locationFilterCode || null}
              onChange={(next) =>
                pending.updateDraft(draft.clientId, { locationFilterCode: next ?? "" })
              }
              options={locationOptions}
              allowClear
              placeholder="All locations"
              ariaLabel="Cut log location filter"
            />
            <DropdownCell
              editable={true}
              value={draft.inventoryId || null}
              onChange={(next) =>
                pending.updateDraft(draft.clientId, { inventoryId: next ?? "" })
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
            editable={true}
            value={draft.cut}
            onChange={(next) => pending.updateDraft(draft.clientId, { cut: next })}
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
            editable={true}
            value={draft.isWaste}
            onChange={(next) => pending.updateDraft(draft.clientId, { isWaste: next })}
            ariaLabel="Cut log waste flag"
          />
        )
      case "notes":
        return (
          <TextCell
            editable={true}
            value={draft.notes}
            onChange={(next) => pending.updateDraft(draft.clientId, { notes: next })}
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

  function renderDraftControl(
    control: { key: string; kind: string },
    gridRow: CutLogDraftGridRow,
  ) {
    if (control.kind === "selection") {
      return null
    }
    if (control.kind === "actions") {
      return (
        <RowActionButton
          label="Remove"
          ariaLabel="Remove draft cut"
          tone="destructive"
          editable={true}
          onClick={() => pending.removeDraft(gridRow.clientId)}
        />
      )
    }
    return null
  }

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

      <Grid<CutLogServerGridRow>
        rows={serverGridRows}
        layout={serverLayout}
        empty={<GridEmpty>No cut logs yet.</GridEmpty>}
        renderCell={renderServerCell}
        renderControl={renderServerControl}
      />

      {draftGridRows.length > 0 ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/[0.04]">
          <div className="border-b border-emerald-500/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700/85">
            New Drafts
          </div>
          <div>
            {draftGridRows.map((draftRow) => (
              <Fragment key={draftRow.id}>
                <ScopedRow<CutLogDraftGridRow>
                  row={draftRow}
                  layout={draftLayout}
                  tone="success"
                  renderCell={renderDraftCell}
                  renderControl={renderDraftControl}
                />
              </Fragment>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          className="rounded border border-[var(--panel-border)] px-2 py-1 hover:bg-[var(--panel-border)]/10"
          onClick={pending.addDraft}
        >
          + Add Pending Cut
        </button>
        {voider.error ? <span className="text-rose-700">{voider.error}</span> : null}
      </div>

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
