"use client"

import { formatStableDateTime } from "@builders/domain"
import {
  RecordGridCellInput,
  RecordItemCell,
  RecordItemSection,
  RecordSectionGrid,
  RecordSectionGridRow,
  RecordRowStatusBadge,
  resolveRecordRowStatus,
  type RecordSectionSubHeaderProps,
  type RecordRowColumnSpec,
} from "@/modules/shared/engines/record-view"
import { formatInventoryQuantity } from "../../../domain/formatters"
import type { CutLogRow } from "../../../domain/types"
import type { InventoryCutLogDraft } from "../controllers/use-inventory-cut-logs-section"

const INVENTORY_CUT_LOG_COLUMNS: RecordRowColumnSpec[] = [
  { key: "createdAt", minWidth: 176, label: "Created" },
  { key: "cut", minWidth: 144, align: "center", label: "Cut" },
  { key: "before", minWidth: 144, align: "center", label: "Before" },
  { key: "after", minWidth: 144, align: "center", label: "After" },
  { key: "notes", minWidth: 320, grow: 2, label: "Notes" },
  { key: "status", minWidth: 120, align: "center", label: "Status" },
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
  const hasRows = cutLogs.length > 0 || Boolean(draft)

  return (
    <RecordItemSection
      title="Cut Logs"
      bodyClassName="space-y-0"
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
        {draft ? (
          <RecordSectionGridRow
            columns={INVENTORY_CUT_LOG_COLUMNS}
            rowTone="allocation"
          >
            <RecordItemCell columnKey="createdAt" chrome="grid" showLabel>
              <span className="text-sm text-[var(--foreground)]/80">New</span>
            </RecordItemCell>
            <RecordItemCell columnKey="cut" chrome="grid" showLabel>
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
            <RecordItemCell columnKey="before" chrome="grid" showLabel>
              <span className="text-sm text-[var(--foreground)]/80">
                {formatInventoryQuantity(draftBefore, stockUnit)}
              </span>
            </RecordItemCell>
            <RecordItemCell columnKey="after" chrome="grid" showLabel>
              <span className="text-sm text-[var(--foreground)]/80">
                {formatInventoryQuantity(draftAfter, stockUnit)}
              </span>
            </RecordItemCell>
            <RecordItemCell columnKey="notes" chrome="grid" showLabel>
              <RecordGridCellInput
                aria-label="Cut Log Notes"
                value={draft.notes}
                onChange={(event) => onDraftChange("notes", event.target.value)}
                placeholder="Notes"
              />
            </RecordItemCell>
            <RecordItemCell columnKey="status" chrome="grid" showLabel>
              <div className="flex min-h-[2.5rem] items-center">
                <RecordRowStatusBadge tone={resolveRecordRowStatus({ isUnsaved: true }).tone}>
                  {resolveRecordRowStatus({ isUnsaved: true }).label}
                </RecordRowStatusBadge>
              </div>
            </RecordItemCell>
          </RecordSectionGridRow>
        ) : null}

        {cutLogs.map((cutLog, index) => (
          <RecordSectionGridRow key={cutLog.id} columns={INVENTORY_CUT_LOG_COLUMNS}>
            <RecordItemCell columnKey="createdAt" chrome="grid" showLabel={!draft && index === 0}>
              <span className="text-sm text-[var(--foreground)]/80">{formatStableDateTime(cutLog.createdAt)}</span>
            </RecordItemCell>
            <RecordItemCell columnKey="cut" chrome="grid" showLabel={!draft && index === 0}>
              <span className="text-sm font-medium text-[var(--foreground)]">
                {formatInventoryQuantity(cutLog.cut, stockUnit)}
              </span>
            </RecordItemCell>
            <RecordItemCell columnKey="before" chrome="grid" showLabel={!draft && index === 0}>
              <span className="text-sm text-[var(--foreground)]/80">
                {formatInventoryQuantity(cutLog.before, stockUnit)}
              </span>
            </RecordItemCell>
            <RecordItemCell columnKey="after" chrome="grid" showLabel={!draft && index === 0}>
              <span className="text-sm text-[var(--foreground)]/80">
                {formatInventoryQuantity(cutLog.after, stockUnit)}
              </span>
            </RecordItemCell>
            <RecordItemCell columnKey="notes" chrome="grid" showLabel={!draft && index === 0}>
              <span className="whitespace-pre-wrap text-sm text-[var(--foreground)]/80">
                {cutLog.notes || "-"}
              </span>
            </RecordItemCell>
            <RecordItemCell columnKey="status" chrome="grid" showLabel={!draft && index === 0}>
              <div className="flex min-h-[2.5rem] items-center">
                <RecordRowStatusBadge tone={resolveRecordRowStatus({}).tone}>
                  {resolveRecordRowStatus({}).label}
                </RecordRowStatusBadge>
              </div>
            </RecordItemCell>
          </RecordSectionGridRow>
        ))}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
