"use client"

import { useMemo } from "react"
import { ActionHeader } from "@/components/headers"
import {
  INVENTORY_CUT_LOG_LAYOUT,
  renderCutLogReadOnlyCell,
} from "@/components/features/cut-log-row"
import { Grid, GridEmpty } from "@/components/grid"
import { formatInventoryQuantity, type InventoryCutLogRow } from "@builders/domain"

export type InventoryCutLogsSectionProps = {
  rows: InventoryCutLogRow[]
  stockUnitAbbrev: string
  coverageUnitAbbrev: string
  totalCutSum: string
  onRowClick: (cutLog: InventoryCutLogRow) => void
}

/**
 * Unified cut-log section for the inventory record view. PENDING rows
 * (caller-sorted to the top) and FINAL/VOID rows (caller-sorted by
 * `finalCutSequence`) render in a single grid; clicking a row opens the
 * view-only side panel that carries the panel-only fields (work order,
 * material item, created, updated).
 */
export function InventoryCutLogsSection({
  rows,
  stockUnitAbbrev,
  coverageUnitAbbrev,
  totalCutSum,
  onRowClick,
}: InventoryCutLogsSectionProps) {
  const renderCell = useMemo(
    () =>
      renderCutLogReadOnlyCell({
        stockUnitFallback: stockUnitAbbrev,
        coverageUnitFallback: coverageUnitAbbrev,
      }),
    [stockUnitAbbrev, coverageUnitAbbrev],
  )

  const counts = useMemo(() => {
    let pending = 0
    let final = 0
    let voided = 0
    for (const row of rows) {
      if (row.status === "VOID" || row.void) voided += 1
      else if (row.status === "FINAL") final += 1
      else pending += 1
    }
    return { pending, final, voided }
  }, [rows])

  const summaryParts = [
    `${rows.length} log${rows.length === 1 ? "" : "s"}`,
    `${formatInventoryQuantity(totalCutSum, stockUnitAbbrev)} cut total`,
    counts.pending > 0 ? `${counts.pending} pending` : null,
    counts.final > 0 ? `${counts.final} final` : null,
    counts.voided > 0 ? `${counts.voided} voided` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <ActionHeader title="Cut Logs" summary={<span>{summaryParts.join(" · ")}</span>} />

      <Grid<InventoryCutLogRow>
        rows={rows}
        layout={INVENTORY_CUT_LOG_LAYOUT}
        empty={<GridEmpty>No cut logs on this inventory.</GridEmpty>}
        renderCell={renderCell}
        onRowClick={onRowClick}
        getRowAriaLabel={(row) => `View cut log ${row.cutLogNumber}`}
      />
    </div>
  )
}
