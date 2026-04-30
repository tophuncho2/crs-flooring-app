"use client"

import { ActionHeader } from "@/components/headers"
import { StatusBadge } from "@/components/badges"
import { CheckboxCell, CurrencyCell, TextCell, UnitCell } from "@/components/cells"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import {
  formatCutLogStatus,
  type CutLogRow,
  type FlooringCutLogStatus,
} from "@builders/domain"

const HISTORICAL_LAYOUT: GridLayout<CutLogRow> = {
  dataColumns: [
    { key: "cutLogNumber", label: "Cut #", minWidth: 132, grow: 0 },
    { key: "cut", label: "Cut", minWidth: 144, grow: 0, align: "center" },
    { key: "coverageCut", label: "Coverage", minWidth: 144, grow: 0, align: "center" },
    { key: "isWaste", label: "Waste", minWidth: 80, grow: 0, align: "center" },
    { key: "before", label: "Before", minWidth: 120, grow: 0, align: "center" },
    { key: "after", label: "After", minWidth: 120, grow: 0, align: "center" },
    { key: "finalSeq", label: "Seq", minWidth: 64, grow: 0, align: "center" },
    { key: "workOrder", label: "Work Order", minWidth: 140, grow: 0 },
    { key: "workOrderItem", label: "Material Item", minWidth: 140, grow: 0 },
    { key: "createdAt", label: "Created", minWidth: 156, grow: 0 },
    { key: "updatedAt", label: "Updated", minWidth: 156, grow: 0 },
    { key: "notes", label: "Notes", minWidth: 220, grow: 1.2 },
  ],
  trailingControls: [{ key: "status", kind: "status-indicator", width: 132 }],
}

function rowStatusTone(row: CutLogRow): "default" | "processing" | "success" | "warning" {
  if (row.status === "QUEUED") return "processing"
  if (row.status === "VOID" || row.void) return "warning"
  if (row.status === "FINAL") return "success"
  return "default"
}

function rowStatusLabel(row: CutLogRow): string {
  // For QUEUED rows in this section (origin = historical), `isFinal` is true
  // and the worker is voiding a previously-finalized row. Surface the
  // canonical status label rather than a custom "voiding" string.
  return formatCutLogStatus(row.status as FlooringCutLogStatus)
}

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export function InventoryHistoricalCutLogsSection({
  rows,
  stockUnitAbbrev,
  coverageUnitAbbrev,
}: {
  rows: CutLogRow[]
  stockUnitAbbrev: string
  coverageUnitAbbrev: string
}) {
  const finalCount = rows.filter((row) => row.status === "FINAL").length
  const voidCount = rows.filter((row) => row.status === "VOID" || row.void).length

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <ActionHeader
        title="Final & Voided Cut Logs"
        summary={
          <span>
            {finalCount} final · {voidCount} voided
          </span>
        }
      />

      <Grid<CutLogRow>
        rows={rows}
        layout={HISTORICAL_LAYOUT}
        empty={<GridEmpty>No finalized or voided cut logs yet.</GridEmpty>}
        renderCell={(column, row) => {
          switch (column.key) {
            case "cutLogNumber":
              return (
                <TextCell editable={false} value={row.cutLogNumber ?? "—"} ariaLabel={`${row.cutLogNumber} number`} />
              )
            case "cut":
              return (
                <UnitCell
                  editable={false}
                  value={row.cut}
                  unit={stockUnitAbbrev}
                  ariaLabel={`${row.cutLogNumber} cut`}
                />
              )
            case "coverageCut":
              return (
                <UnitCell
                  editable={false}
                  value={row.coverageCut ?? ""}
                  unit={coverageUnitAbbrev}
                  ariaLabel={`${row.cutLogNumber} coverage cut`}
                />
              )
            case "isWaste":
              return (
                <CheckboxCell editable={false} value={row.isWaste} ariaLabel={`${row.cutLogNumber} waste`} />
              )
            case "before":
              return (
                <TextCell editable={false} value={row.before ?? "—"} ariaLabel={`${row.cutLogNumber} before`} />
              )
            case "after":
              return (
                <TextCell editable={false} value={row.after ?? "—"} ariaLabel={`${row.cutLogNumber} after`} />
              )
            case "finalSeq":
              return (
                <TextCell
                  editable={false}
                  value={row.finalCutSequence != null ? String(row.finalCutSequence) : "—"}
                  ariaLabel={`${row.cutLogNumber} final sequence`}
                />
              )
            case "workOrder":
              return (
                <TextCell
                  editable={false}
                  value={row.workOrderId ?? "—"}
                  ariaLabel={`${row.cutLogNumber} work order`}
                />
              )
            case "workOrderItem":
              return (
                <TextCell
                  editable={false}
                  value={row.workOrderItemId ?? "—"}
                  ariaLabel={`${row.cutLogNumber} material item`}
                />
              )
            case "createdAt":
              return (
                <TextCell
                  editable={false}
                  value={formatTimestamp(row.createdAt)}
                  ariaLabel={`${row.cutLogNumber} created at`}
                />
              )
            case "updatedAt":
              return (
                <TextCell
                  editable={false}
                  value={formatTimestamp(row.updatedAt)}
                  ariaLabel={`${row.cutLogNumber} updated at`}
                />
              )
            case "notes":
              return (
                <TextCell editable={false} value={row.notes || "—"} ariaLabel={`${row.cutLogNumber} notes`} />
              )
            default:
              return null
          }
        }}
        renderControl={(control, row) => {
          if (control.kind === "status-indicator") {
            return <StatusBadge tone={rowStatusTone(row)}>{rowStatusLabel(row)}</StatusBadge>
          }
          return null
        }}
      />
    </div>
  )
}
