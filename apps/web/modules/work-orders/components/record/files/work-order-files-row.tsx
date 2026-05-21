"use client"

import { StatusBadge } from "@/components/badges"
import type { WorkOrderFileRow } from "@/modules/work-orders/data/queries"

function statusTone(status: WorkOrderFileRow["status"]) {
  switch (status) {
    case "COMPLETED":
      return "success" as const
    case "WORKING":
      return "processing" as const
    case "QUEUED":
      return "warning" as const
    case "FAILED":
      return "error" as const
    default:
      return "muted" as const
  }
}

function formatFileNumber(n: number) {
  return `WO-FILE-${n}`
}

/**
 * Taller file row for the WO files side panel. Five surfaces visible:
 * file number, status badge, error (when present), download (when
 * completed), delete (always). Read-only values stack on the left;
 * action buttons sit on the right.
 */
export function WorkOrderFilesRow({
  file,
  isDeleting,
  onDownload,
  onDelete,
}: {
  file: WorkOrderFileRow
  isDeleting: boolean
  onDownload: () => void
  onDelete: () => void
}) {
  const canDownload = file.status === "COMPLETED" && Boolean(file.fileKey)

  return (
    <div className="flex items-start gap-3 border-b border-[var(--panel-border)]/60 px-3 py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium text-[var(--foreground)]">
            {formatFileNumber(file.fileNumber)}
          </span>
          <StatusBadge tone={statusTone(file.status)}>{file.status}</StatusBadge>
        </div>
        {file.errorMessage ? (
          <p className="whitespace-pre-line text-xs text-rose-700">{file.errorMessage}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {canDownload ? (
          <button
            type="button"
            className="rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-xs hover:bg-[var(--panel-border)]/15"
            onClick={onDownload}
          >
            Download
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-md border border-rose-500/40 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-500/10 disabled:opacity-50"
          disabled={isDeleting}
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
