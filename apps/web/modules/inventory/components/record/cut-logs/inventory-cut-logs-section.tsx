"use client"

import { ActionHeader } from "@/components/headers"
import {
  INVENTORY_CUT_LOG_LAYOUT,
  renderCutLogReadOnlyCell,
  renderCutLogStatusControl,
} from "@/components/features/cut-log-row"
import { Grid, GridEmpty } from "@/components/grid"
import { formatInventoryQuantity, type CutLogRow } from "@builders/domain"

export function InventoryCutLogsSection({
  rows,
  stockUnitAbbrev,
  coverageUnitAbbrev,
  totalCutSum,
}: {
  rows: CutLogRow[]
  stockUnitAbbrev: string
  coverageUnitAbbrev: string
  totalCutSum: string
}) {
  const renderCell = renderCutLogReadOnlyCell({
    stockUnitFallback: stockUnitAbbrev,
    coverageUnitFallback: coverageUnitAbbrev,
  })

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <ActionHeader
        title="Cut Logs"
        summary={
          <span>
            {rows.length} log
            {rows.length === 1 ? "" : "s"} ·{" "}
            {formatInventoryQuantity(totalCutSum, stockUnitAbbrev)} cut total
          </span>
        }
      />

      <Grid<CutLogRow>
        rows={rows}
        layout={INVENTORY_CUT_LOG_LAYOUT}
        empty={<GridEmpty>No active cut logs on this inventory.</GridEmpty>}
        renderCell={renderCell}
        renderControl={renderCutLogStatusControl}
      />
    </div>
  )
}
