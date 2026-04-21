"use client"

import { formatStableDateTime } from "@builders/domain"
import {
  RecordItemCell,
  RecordItemSection,
  RecordSectionGrid,
  RecordSectionGridRow,
  RecordRowStatusBadge,
  resolveRecordRowStatus,
  type RecordRowColumnSpec,
} from "@/modules/shared/engines/record-view"
import { formatInventoryQuantity, type CutLogRow } from "@builders/domain"

const INVENTORY_CUT_LOG_COLUMNS: RecordRowColumnSpec[] = [
  { key: "createdAt", minWidth: 176, label: "Created" },
  { key: "cut", minWidth: 144, align: "center", label: "Cut" },
  { key: "before", minWidth: 144, align: "center", label: "Before" },
  { key: "after", minWidth: 144, align: "center", label: "After" },
  { key: "status", minWidth: 120, align: "center", label: "Status" },
  { key: "notes", minWidth: 320, grow: 2, label: "Notes" },
]

/**
 * Phase F scaffold: read-only cut-log row list with summary metrics.
 *
 * Save / draft editing / add-row controls are intentionally absent — the
 * parent-scoped save route (`/api/inventory/[id]/cut-logs/section`) and the
 * `saveInventoryCutLogsUseCase` both land in Sweep 3. The component + grid
 * primitives are present so the record view composes today; Sweep 3 extends
 * this file with editable drafts + save wiring.
 */
export function InventoryCutLogsSection({
  cutLogs,
  stockUnit,
  totalCutBalance,
  awaitingCutBalance,
}: {
  cutLogs: CutLogRow[]
  stockUnit: string
  totalCutBalance: string
  awaitingCutBalance: string
}) {
  const hasRows = cutLogs.length > 0

  return (
    <RecordItemSection
      title="Cut Logs"
      bodyClassName="space-y-0"
      metrics={[
        { label: "Logs", value: String(cutLogs.length) },
        { label: "Final Cuts", value: formatInventoryQuantity(totalCutBalance, stockUnit) },
        { label: "Pending Cuts", value: formatInventoryQuantity(awaitingCutBalance, stockUnit) },
      ]}
      capabilities={{
        editable: false,
        supportsAddRow: false,
        supportsSaveDiscard: false,
        supportsMetrics: true,
        supportsSummary: false,
        supportsEmptyState: true,
        supportsStatusColumn: true,
      }}
      isEmpty={!hasRows}
      emptyState="No cut logs recorded for this inventory row."
    >
      <RecordSectionGrid
        columns={INVENTORY_CUT_LOG_COLUMNS}
        isEmpty={!hasRows}
        emptyState="No cut logs recorded for this inventory row."
      >
        {cutLogs.map((cutLog, index) => {
          const statusResolution = resolveRecordRowStatus({})
          return (
            <RecordSectionGridRow key={cutLog.id} columns={INVENTORY_CUT_LOG_COLUMNS}>
              <RecordItemCell columnKey="createdAt" chrome="grid" showLabel={index === 0}>
                <span className="text-sm text-[var(--foreground)]/80">
                  {formatStableDateTime(cutLog.createdAt)}
                </span>
              </RecordItemCell>
              <RecordItemCell columnKey="cut" chrome="grid" showLabel={index === 0}>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {formatInventoryQuantity(cutLog.cut, stockUnit)}
                </span>
              </RecordItemCell>
              <RecordItemCell columnKey="before" chrome="grid" showLabel={index === 0}>
                <span className="text-sm text-[var(--foreground)]/80">
                  {formatInventoryQuantity(cutLog.before, stockUnit)}
                </span>
              </RecordItemCell>
              <RecordItemCell columnKey="after" chrome="grid" showLabel={index === 0}>
                <span className="text-sm text-[var(--foreground)]/80">
                  {formatInventoryQuantity(cutLog.after, stockUnit)}
                </span>
              </RecordItemCell>
              <RecordItemCell columnKey="status" chrome="grid" showLabel={index === 0}>
                <div className="flex min-h-[2.5rem] items-center">
                  <RecordRowStatusBadge tone={statusResolution.tone}>
                    {cutLog.status === "FINAL" ? "Final" : "Pending"}
                  </RecordRowStatusBadge>
                </div>
              </RecordItemCell>
              <RecordItemCell columnKey="notes" chrome="grid" showLabel={index === 0}>
                <span className="whitespace-pre-wrap text-sm text-[var(--foreground)]/80">
                  {cutLog.notes || "-"}
                </span>
              </RecordItemCell>
            </RecordSectionGridRow>
          )
        })}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
