"use client"

import { ActionHeader } from "@/components/headers"
import {
  INVENTORY_HISTORICAL_CUT_LOG_LAYOUT,
  renderCutLogReadOnlyCell,
  renderCutLogStatusControl,
} from "@/components/features/cut-log-row"
import { Grid, GridEmpty } from "@/components/grid"
import type { CutLogRow } from "@builders/domain"

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

  const renderCell = renderCutLogReadOnlyCell({
    stockUnitFallback: stockUnitAbbrev,
    coverageUnitFallback: coverageUnitAbbrev,
  })

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
        layout={INVENTORY_HISTORICAL_CUT_LOG_LAYOUT}
        empty={<GridEmpty>No finalized or voided cut logs yet.</GridEmpty>}
        renderCell={renderCell}
        renderControl={renderCutLogStatusControl}
      />
    </div>
  )
}
