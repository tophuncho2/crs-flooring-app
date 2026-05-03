"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { CutLogRow } from "@builders/domain"
import { CheckboxCell, DropdownCell, NumberCell, TextCell } from "@/components/cells"
import { renderCutLogReadOnlyCell } from "@/components/features/cut-log-row"
import { Grid, GridEmpty } from "@/components/grid"
import type { GridControlColumn } from "@/components/grid/contracts/grid-control-column"
import {
  usePendingCutLogSection,
  type PendingCutLogRowController,
} from "@/modules/work-orders/controllers/record/material-items/use-pending-cut-log-section"
import { listEligibleInventoryRequest } from "@/modules/work-orders/data/mutations"
import { WO_CUT_LOG_LAYOUT, type CutLogGridRow } from "./cut-log-row-layout"
import {
  renderCutLogCommitControl,
  renderCutLogDestructiveCell,
  renderCutLogSelectionControl,
  renderCutLogStatusBadge,
} from "./cut-log-row-controls"

type EligibleInventory = {
  id: string
  inventoryNumber: string
  itemNumber: string
  dyeLot: string
  remainingStock: string
  stockUnitAbbrev: string
  locationCode: string
  sectionCode: string
}

export function WorkOrderCutLogRow({
  workOrderId,
  workOrderItemId,
  serverRows,
  selectedIds,
  onToggleSelected,
  canToggleSelection,
  isSectionBusy,
  onError,
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
  /**
   * Bubble per-row mutation errors up so they can render at the section
   * header (canonical placement). Receives the latest error message, or
   * null when all errors have cleared.
   */
  onError?: (message: string | null) => void
}) {
  const section = usePendingCutLogSection({
    workOrderId,
    workOrderItemId,
    initialRows: serverRows,
  })

  // Bubble row-level errors to the parent section so they render at the
  // ActionHeader's error slot (canonical for sections — see imports module).
  useEffect(() => {
    if (!onError) return
    const messages = Object.values(section.errorByRowId).filter((m): m is string => Boolean(m))
    onError(messages[messages.length - 1] ?? null)
  }, [section.errorByRowId, onError])

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
  const distinctSectionCodes = useMemo(
    () => Array.from(new Set(eligibleInventory.map((i) => i.sectionCode).filter(Boolean))).sort(),
    [eligibleInventory],
  )
  const sectionOptions = useMemo(
    () => distinctSectionCodes.map((code) => ({ id: code, label: code })),
    [distinctSectionCodes],
  )
  const inventoryById = useMemo(() => {
    const map = new Map<string, EligibleInventory>()
    for (const inv of eligibleInventory) map.set(inv.id, inv)
    return map
  }, [eligibleInventory])

  function filteredInventories(form: { locationFilterCode: string; sectionFilterCode: string }): EligibleInventory[] {
    if (form.sectionFilterCode) {
      return eligibleInventory.filter((inv) => inv.sectionCode === form.sectionFilterCode)
    }
    if (form.locationFilterCode) {
      return eligibleInventory.filter((inv) => inv.locationCode === form.locationFilterCode)
    }
    return eligibleInventory
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
      const filtered = filteredInventories(rc.form)
      const inventoryOptions = filtered.map((inv) => ({
        id: inv.id,
        label: `${inv.inventoryNumber} · ${inv.remainingStock} ${inv.stockUnitAbbrev}${
          inv.locationCode ? ` · ${inv.locationCode}` : ""
        }`,
      }))
      const editable = rc.isEditing && !isSectionBusy
      const hasAnyFilter = !!(rc.form.sectionFilterCode || rc.form.locationFilterCode)
      return (
        <div className="flex w-full flex-col gap-1">
          <div className="flex items-center gap-1">
            <div className="flex-1">
              <DropdownCell
                editable={editable && !rc.form.locationFilterCode}
                value={rc.form.sectionFilterCode || null}
                onChange={(next) => rc.setSectionFilterCode(next ?? "")}
                options={sectionOptions}
                allowClear
                placeholder={rc.form.locationFilterCode ? "Location set" : "All sections"}
                ariaLabel="Cut log section filter"
              />
            </div>
            <div className="flex-1">
              <DropdownCell
                editable={editable && !rc.form.sectionFilterCode}
                value={rc.form.locationFilterCode || null}
                onChange={(next) => rc.setLocationFilterCode(next ?? "")}
                options={locationOptions}
                allowClear
                placeholder={rc.form.sectionFilterCode ? "Section set" : "All locations"}
                ariaLabel="Cut log location filter"
              />
            </div>
            <button
              type="button"
              onClick={rc.clearLocationAndSectionFilters}
              disabled={!editable || !hasAnyFilter}
              className="rounded border border-[var(--panel-border)] px-1.5 py-0.5 text-[11px] hover:bg-[var(--panel-border)]/10 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Clear section and location filters"
              title="Clear filters"
            >
              Clear
            </button>
          </div>
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
      return renderCutLogSelectionControl(rc, {
        selectedIds,
        onToggleSelected,
        canToggleSelection,
        isSectionBusy,
      })
    }
    if (control.kind === "status-indicator") return renderCutLogStatusBadge(control, rc)
    if (control.kind === "commit") return renderCutLogCommitControl(rc, isSectionBusy)
    if (control.kind === "actions") return renderCutLogDestructiveCell(rc, isSectionBusy)
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
