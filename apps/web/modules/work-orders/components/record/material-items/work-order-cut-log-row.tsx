"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { CutLogRow, FlooringCutLogStatus } from "@builders/domain"
import { CutLogStatusBadge } from "@/components/badges"
import {
  CheckboxCell,
  CircularCommitButton,
  DropdownCell,
  NumberCell,
  TextCell,
} from "@/components/cells"
import { ConfirmActionButton } from "@/components/features/confirm-action"
import {
  renderCutLogReadOnlyCell,
  renderCutLogStatusControl,
} from "@/components/features/cut-log-row"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import type { GridControlColumn } from "@/components/grid/contracts/grid-control-column"
import {
  usePendingCutLogSection,
  type PendingCutLogRowController,
} from "@/modules/work-orders/controllers/use-pending-cut-log-section"
import { listEligibleInventoryRequest } from "@/modules/work-orders/data/mutations"

type EligibleInventory = {
  id: string
  inventoryNumber: string
  itemNumber: string
  dyeLot: string
  remainingStock: string
  stockUnitAbbrev: string
  locationCode: string
}

type CutLogGridRow = {
  id: string
  /** Per-row controller projection from the section hook. */
  controller: PendingCutLogRowController
}

const WO_CUT_LOG_LAYOUT: GridLayout<CutLogGridRow> = {
  leadingControls: [{ key: "select", kind: "selection", width: 40 }],
  dataColumns: [
    { key: "cutLogNumber", label: "Cut #", minWidth: 132, grow: 0 },
    { key: "inventoryRef", label: "Inventory", minWidth: 240, grow: 1 },
    { key: "cut", label: "Cut", minWidth: 110, grow: 0, align: "center" },
    { key: "coverageCut", label: "Coverage", minWidth: 120, grow: 0, align: "center" },
    { key: "isWaste", label: "Waste", minWidth: 70, grow: 0, align: "center" },
    { key: "before", label: "Before", minWidth: 90, grow: 0, align: "center" },
    { key: "after", label: "After", minWidth: 90, grow: 0, align: "center" },
    { key: "finalSeq", label: "Seq", minWidth: 64, grow: 0, align: "center" },
    { key: "notes", label: "Notes", minWidth: 200, grow: 1.5 },
    { key: "createdAt", label: "Created", minWidth: 140, grow: 0 },
    { key: "updatedAt", label: "Updated", minWidth: 140, grow: 0 },
  ],
  trailingControls: [
    { key: "status", kind: "status-indicator", width: 120 },
    { key: "destructive", kind: "actions", width: 80 },
    { key: "commit", kind: "commit", width: 56 },
  ],
}

function pickDestructiveCopy(status: FlooringCutLogStatus | "DRAFT", cutLogNumber: string): {
  label: string
  pendingLabel: string
  confirmTitle: string
  confirmMessage: ReactNode
  confirmLabel: string
  ariaLabel: string
} {
  if (status === "FINAL") {
    return {
      label: "Void",
      pendingLabel: "Voiding…",
      confirmTitle: `Void ${cutLogNumber}?`,
      confirmMessage:
        "Voiding marks this finalized cut log as no longer counted; the row stays in the history with its original sequence number. This cannot be undone.",
      confirmLabel: "Void cut log",
      ariaLabel: `Void cut ${cutLogNumber}`,
    }
  }
  // PENDING (or DRAFT — destructive on a draft just discards locally; no
  // confirm needed, but the button still routes through the same prop
  // surface to keep the column constant).
  return {
    label: status === "DRAFT" ? "Discard" : "Delete",
    pendingLabel: "Deleting…",
    confirmTitle: status === "DRAFT" ? "Discard draft?" : `Delete ${cutLogNumber}?`,
    confirmMessage:
      status === "DRAFT"
        ? "Discards the unsaved draft row."
        : "This pending cut log will be removed. Final cuts cannot be deleted — they can only be voided.",
    confirmLabel: status === "DRAFT" ? "Discard" : "Delete cut log",
    ariaLabel: `Remove cut ${cutLogNumber}`,
  }
}

export function WorkOrderCutLogRow({
  workOrderId,
  workOrderItemId,
  serverRows,
  selectedIds,
  onToggleSelected,
  canToggleSelection,
  isSectionBusy,
}: {
  workOrderId: string
  workOrderItemId: string
  serverRows: ReadonlyArray<CutLogRow>
  selectedIds: ReadonlySet<string>
  onToggleSelected: (cutLogId: string) => void
  canToggleSelection: boolean
  /**
   * True when the parent material-items section has any in-flight or
   * selection-active state. Used to lock the per-row commit/edit affordances
   * during finalize / material-item save.
   */
  isSectionBusy: boolean
}) {
  const section = usePendingCutLogSection({
    workOrderId,
    workOrderItemId,
    initialRows: serverRows,
  })

  // Eligible inventory for the inventory dropdown on draft rows. Loaded
  // lazily; once loaded, used both for the dropdown options and for the
  // saved-row inventory display name.
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
    () => Array.from(new Set(eligibleInventory.map((i) => i.locationCode).filter(Boolean))).sort(),
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

  function inventoriesForLocation(code: string): EligibleInventory[] {
    if (!code) return eligibleInventory
    return eligibleInventory.filter((inv) => inv.locationCode === code)
  }

  // Build the grid rows: drafts first (so they render at the top while the
  // user is filling them in), then saved rows in their existing order.
  const gridRows: CutLogGridRow[] = useMemo(() => {
    return section.rowIds
      .map((id) => {
        const controller = section.getRowController(id)
        if (!controller) return null
        return { id, controller } as CutLogGridRow
      })
      .filter((row): row is CutLogGridRow => row !== null)
  }, [section])

  // Read-only fallback renderer for rows that aren't currently being edited.
  const renderReadOnlyCell = useMemo(
    () => renderCutLogReadOnlyCell({}),
    [],
  )

  function renderInventoryCell(rc: PendingCutLogRowController): ReactNode {
    if (rc.kind === "draft") {
      const filtered = inventoriesForLocation(rc.form.locationFilterCode)
      const inventoryOptions = filtered.map((inv) => ({
        id: inv.id,
        label: `${inv.inventoryNumber} · ${inv.remainingStock} ${inv.stockUnitAbbrev}${
          inv.locationCode ? ` · ${inv.locationCode}` : ""
        }`,
      }))
      const editable = rc.isEditing && !isSectionBusy
      return (
        <div className="flex w-full flex-col gap-1">
          <DropdownCell
            editable={editable}
            value={rc.form.locationFilterCode || null}
            onChange={(next) => rc.setLocationFilterCode(next ?? "")}
            options={locationOptions}
            allowClear
            placeholder="All locations"
            ariaLabel="Cut log location filter"
          />
          <DropdownCell
            editable={editable}
            value={rc.form.inventoryId || null}
            onChange={(next) => rc.setInventoryId(next ?? "")}
            options={inventoryOptions}
            placeholder={loadingInventory ? "Loading…" : "Pick inventory"}
            ariaLabel="Cut log inventory"
          />
        </div>
      )
    }
    // Saved row — display the inventory by its enriched label when we
    // have it, else by id. Read-only.
    const row = rc.row
    if (!row) return null
    const inv = inventoryById.get(row.inventoryId)
    const label = inv
      ? `${inv.inventoryNumber}${inv.locationCode ? ` · ${inv.locationCode}` : ""}`
      : row.inventoryId
    return <span className="truncate">{label}</span>
  }

  function renderCell(column: { key: string }, gridRow: CutLogGridRow): ReactNode {
    const rc = gridRow.controller
    // Editable-cell branches: only when the row is currently the editingRow
    // AND it isn't locked by a section-level busy signal.
    const isEditableNow = rc.isEditing && !isSectionBusy

    if (column.key === "inventoryRef") {
      return renderInventoryCell(rc)
    }

    if (rc.kind === "draft") {
      // Drafts have no server snapshot — render placeholders + editable cells.
      switch (column.key) {
        case "cutLogNumber":
          return <span className="italic text-[var(--foreground)]/55">new</span>
        case "cut":
          return (
            <NumberCell
              editable={isEditableNow}
              value={rc.form.cut}
              onChange={(next) => rc.setCut(next)}
              ariaLabel="Cut amount"
            />
          )
        case "isWaste":
          return (
            <CheckboxCell
              editable={isEditableNow}
              value={rc.form.isWaste}
              onChange={(next) => rc.setIsWaste(next)}
              ariaLabel="Cut log waste flag"
            />
          )
        case "notes":
          return (
            <TextCell
              editable={isEditableNow}
              value={rc.form.notes}
              onChange={(next) => rc.setNotes(next)}
              placeholder="Notes"
              ariaLabel="Cut log notes"
            />
          )
        case "before":
        case "after":
        case "coverageCut":
        case "finalSeq":
        case "createdAt":
        case "updatedAt":
          return <span className="tabular-nums text-[var(--foreground)]/55">—</span>
        default:
          return null
      }
    }

    // Saved row.
    const savedRow = rc.row
    if (!savedRow) return null

    if (isEditableNow) {
      switch (column.key) {
        case "cut":
          return (
            <NumberCell
              editable
              value={rc.form.cut}
              onChange={(next) => rc.setCut(next)}
              ariaLabel="Cut amount"
            />
          )
        case "isWaste":
          return (
            <CheckboxCell
              editable
              value={rc.form.isWaste}
              onChange={(next) => rc.setIsWaste(next)}
              ariaLabel="Cut log waste flag"
            />
          )
        case "notes":
          return (
            <TextCell
              editable
              value={rc.form.notes}
              onChange={(next) => rc.setNotes(next)}
              placeholder="Notes"
              ariaLabel="Cut log notes"
            />
          )
      }
    }

    return renderReadOnlyCell(column, savedRow)
  }

  function renderControl(control: GridControlColumn, gridRow: CutLogGridRow): ReactNode {
    const rc = gridRow.controller

    if (control.kind === "selection") {
      // Drafts aren't finalizable (they don't exist server-side yet).
      if (rc.kind === "draft" || !rc.row) return null
      const status = rc.row.status as FlooringCutLogStatus
      if (status !== "PENDING") return null
      return (
        <CheckboxCell
          editable={canToggleSelection && !isSectionBusy}
          value={selectedIds.has(rc.row.id)}
          onChange={() => onToggleSelected(rc.row!.id)}
          ariaLabel={`Select cut ${rc.row.cutLogNumber}`}
        />
      )
    }

    if (control.kind === "status-indicator") {
      if (rc.kind === "draft" || !rc.row) {
        return <CutLogStatusBadge status={"PENDING" as FlooringCutLogStatus} />
      }
      return renderCutLogStatusControl(control, rc.row)
    }

    if (control.kind === "actions") {
      const cutLogNumber = rc.row?.cutLogNumber ?? "draft"
      const copy = pickDestructiveCopy(rc.destructiveStatus, cutLogNumber)

      // Drafts: no confirm dialog — just discard locally.
      if (rc.kind === "draft") {
        return (
          <ConfirmActionButton
            label={copy.label}
            ariaLabel={copy.ariaLabel}
            buttonTone="destructive"
            editable={!isSectionBusy}
            confirmTitle={copy.confirmTitle}
            confirmMessage={copy.confirmMessage}
            confirmLabel={copy.confirmLabel}
            confirmTone="destructive"
            pendingLabel={copy.pendingLabel}
            onConfirm={async () => {
              rc.discardDraft()
            }}
          />
        )
      }

      // Saved row: status-aware destructive (delete for PENDING, void for FINAL).
      // Disabled with tooltip for VOID/QUEUED.
      const disabledTitle =
        rc.destructiveStatus === "VOID"
          ? "Already voided"
          : rc.destructiveStatus === "QUEUED"
            ? "Cut log is in flight; refresh to see latest state"
            : undefined
      return (
        <ConfirmActionButton
          label={
            rc.commitState === "pending" && rc.destructiveStatus !== "PENDING"
              ? copy.pendingLabel
              : copy.label
          }
          ariaLabel={copy.ariaLabel}
          buttonTone="destructive"
          editable={rc.destructiveEnabled && !isSectionBusy}
          title={disabledTitle}
          confirmTitle={copy.confirmTitle}
          confirmMessage={copy.confirmMessage}
          confirmLabel={copy.confirmLabel}
          confirmTone="destructive"
          pendingLabel={copy.pendingLabel}
          onConfirm={async () => {
            rc.fireDestructive()
          }}
        />
      )
    }

    if (control.kind === "commit") {
      const editable = !isSectionBusy
      const cutLogNumber = rc.row?.cutLogNumber ?? "new draft"
      const title =
        rc.commitState === "pristine"
          ? "No changes to save"
          : rc.commitState === "pending"
            ? "Saving…"
            : rc.commitState === "success"
              ? "Saved"
              : "Save row"
      return (
        <CircularCommitButton
          editable={editable}
          state={rc.commitState}
          title={title}
          ariaLabel={`Save cut ${cutLogNumber}`}
          onClick={rc.commit}
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
          {gridRows.length} row{gridRows.length === 1 ? "" : "s"}
        </span>
      </div>

      <Grid<CutLogGridRow>
        rows={gridRows}
        layout={WO_CUT_LOG_LAYOUT}
        empty={<GridEmpty>No cut logs yet.</GridEmpty>}
        renderCell={renderCell}
        renderControl={renderControl}
      />

      {/*
        "Add Pending Cut" lives inside this WOMI's expanded cut-log
        section per the locked sweep decision — one button per WOMI, not
        promoted to a section-wide header. Each material item owns its
        own cut-log set, so this is the right scope.
      */}
      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          className="rounded border border-[var(--panel-border)] px-2 py-1 hover:bg-[var(--panel-border)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={section.addDraft}
          disabled={isSectionBusy}
        >
          + Add Pending Cut
        </button>
      </div>
    </div>
  )
}
