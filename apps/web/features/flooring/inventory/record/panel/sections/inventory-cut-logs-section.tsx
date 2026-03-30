"use client"

import { formatStableDateTime } from "@/features/flooring/shared/utils/date-format"
import {
  RecordItemCell,
  RecordRowLayout,
  RecordSectionItem,
  RecordSectionShell,
} from "@/features/shared/engines/record-view"
import { formatInventoryQuantity } from "../../../domain/formatters"
import type { CutLogRow } from "../../../domain/types"

const INVENTORY_CUT_LOG_COLUMNS = [
  { key: "createdAt", minWidth: 176 },
  { key: "cut", minWidth: 144, align: "center" as const },
  { key: "before", minWidth: 144, align: "center" as const },
  { key: "after", minWidth: 144, align: "center" as const },
  { key: "notes", minWidth: 320, grow: 2 },
]

export function InventoryCutLogsSection({
  cutLogs,
  stockUnit,
  cutTotal,
}: {
  cutLogs: CutLogRow[]
  stockUnit: string
  cutTotal: string
}) {
  return (
    <RecordSectionShell
      title="Cut Logs"
      bodyClassName="space-y-4"
      metrics={[
        { label: "Logs", value: String(cutLogs.length) },
        { label: "Cuts Total", value: formatInventoryQuantity(cutTotal, stockUnit) },
      ]}
    >
      {cutLogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-8 text-center text-[var(--foreground)]/65">
          No cut logs recorded for this inventory row.
        </div>
      ) : null}

      {cutLogs.map((cutLog) => (
        <RecordSectionItem key={cutLog.id}>
          <RecordRowLayout columns={INVENTORY_CUT_LOG_COLUMNS}>
            <RecordItemCell label="Created" columnKey="createdAt">
              <span className="text-sm text-[var(--foreground)]/80">{formatStableDateTime(cutLog.createdAt)}</span>
            </RecordItemCell>
            <RecordItemCell label="Cut" columnKey="cut" align="center">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {formatInventoryQuantity(cutLog.cut, stockUnit)}
              </span>
            </RecordItemCell>
            <RecordItemCell label="Before" columnKey="before" align="center">
              <span className="text-sm text-[var(--foreground)]/80">
                {formatInventoryQuantity(cutLog.before, stockUnit)}
              </span>
            </RecordItemCell>
            <RecordItemCell label="After" columnKey="after" align="center">
              <span className="text-sm text-[var(--foreground)]/80">
                {formatInventoryQuantity(cutLog.after, stockUnit)}
              </span>
            </RecordItemCell>
            <RecordItemCell label="Notes" columnKey="notes">
              <span className="whitespace-pre-wrap text-sm text-[var(--foreground)]/80">
                {cutLog.notes || "-"}
              </span>
            </RecordItemCell>
          </RecordRowLayout>
        </RecordSectionItem>
      ))}
    </RecordSectionShell>
  )
}
