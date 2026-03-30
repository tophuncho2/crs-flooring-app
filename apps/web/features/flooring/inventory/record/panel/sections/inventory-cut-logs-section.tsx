"use client"

import type { ReactNode } from "react"
import { formatStableDateTime } from "@/features/flooring/shared/utils/date-format"
import {
  RecordGridCellInput,
  RecordItemSection,
  RecordItemCell,
  RecordRowLayout,
  RecordSectionItem,
  RecordSectionStatusBadge,
  type RecordSectionSubHeaderProps,
} from "@/features/shared/engines/record-view"
import { formatInventoryQuantity } from "../../../domain/formatters"
import type { CutLogRow } from "../../../domain/types"
import type { InventoryCutLogDraft } from "../controllers/use-inventory-cut-logs-section"

const INVENTORY_CUT_LOG_COLUMNS = [
  { key: "createdAt", minWidth: 176 },
  { key: "cut", minWidth: 144, align: "center" as const },
  { key: "before", minWidth: 144, align: "center" as const },
  { key: "after", minWidth: 144, align: "center" as const },
  { key: "notes", minWidth: 320, grow: 2 },
]

export function InventoryCutLogsSection({
  subHeader,
  cutLogs,
  stockUnit,
  cutTotal,
  draft,
  draftBefore,
  draftAfter,
  noticeMessage,
  noticeError,
  onDraftChange,
}: {
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  cutLogs: CutLogRow[]
  stockUnit: string
  cutTotal: string
  draft: InventoryCutLogDraft | null
  draftBefore: string
  draftAfter: string
  noticeMessage?: string
  noticeError?: string
  onDraftChange: (field: keyof Omit<InventoryCutLogDraft, "id">, value: string) => void
}) {
  return (
    <RecordItemSection
      title="Cut Logs"
      bodyClassName="space-y-4"
      subHeader={subHeader}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      metrics={[
        { label: "Logs", value: String(cutLogs.length) },
        { label: "Cuts Total", value: formatInventoryQuantity(cutTotal, stockUnit) },
      ]}
      capabilities={{
        editable: true,
        supportsAddRow: true,
        supportsSaveDiscard: true,
        supportsMetrics: true,
        supportsSummary: true,
        supportsEmptyState: true,
      }}
      isEmpty={cutLogs.length === 0 && !draft}
      emptyState={(
        <div className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-8 text-center text-[var(--foreground)]/65">
          No cut logs recorded for this inventory row.
        </div>
      )}
    >
      {draft ? (
        <RecordSectionItem
          status={<RecordSectionStatusBadge tone="warning">Draft</RecordSectionStatusBadge>}
        >
          <RecordRowLayout columns={INVENTORY_CUT_LOG_COLUMNS}>
            <RecordItemCell label="Created" columnKey="createdAt">
              <span className="text-sm text-[var(--foreground)]/80">New</span>
            </RecordItemCell>
            <RecordItemCell label="Cut" columnKey="cut" align="center">
              <RecordGridCellInput
                aria-label="Cut Quantity"
                value={draft.quantityTaken}
                inputMode="decimal"
                placeholder="0.00"
                onChange={(event) => onDraftChange("quantityTaken", event.target.value)}
                align="center"
                controlSize="compact"
              />
            </RecordItemCell>
            <RecordItemCell label="Before" columnKey="before" align="center">
              <span className="text-sm text-[var(--foreground)]/80">
                {formatInventoryQuantity(draftBefore, stockUnit)}
              </span>
            </RecordItemCell>
            <RecordItemCell label="After" columnKey="after" align="center">
              <span className="text-sm text-[var(--foreground)]/80">
                {formatInventoryQuantity(draftAfter, stockUnit)}
              </span>
            </RecordItemCell>
            <RecordItemCell label="Notes" columnKey="notes">
              <RecordGridCellInput
                aria-label="Cut Log Notes"
                value={draft.notes}
                onChange={(event) => onDraftChange("notes", event.target.value)}
                placeholder="Notes"
              />
            </RecordItemCell>
          </RecordRowLayout>
        </RecordSectionItem>
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
    </RecordItemSection>
  )
}
