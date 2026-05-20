"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/dialogs"
import { SidePanelPreview } from "@/components/side-panel-preview"
import { useWorkOrderFilesPanel } from "@/modules/work-orders/controllers/record/files/use-work-order-files-panel"
import type { WorkOrderFileRow } from "@/modules/work-orders/data/queries"
import { WorkOrderFilesRow } from "./work-order-files-row"
import { WorkOrderFilesGenerateButton } from "./toolbar-controls/sub-controls/work-order-files-generate-button"
import { WorkOrderFilesRefreshButton } from "./toolbar-controls/sub-controls/work-order-files-refresh-button"

function formatFileNumber(n: number) {
  return `WO-FILE-${String(n).padStart(3, "0")}`
}

/**
 * Right-side file panel for a work order. Owns its react-query list
 * (fresh fetch on open via `staleTime: 0, gcTime: 0`) and exposes
 * Generate + Refresh in the footer. File rows appear above the footer
 * with status, error, file #, plus download/delete actions.
 */
export function WorkOrderFilesPanel({
  open,
  onClose,
  workOrderId,
}: {
  open: boolean
  onClose: () => void
  workOrderId: string
}) {
  const panel = useWorkOrderFilesPanel({ workOrderId, enabled: open })
  const [pendingDelete, setPendingDelete] = useState<WorkOrderFileRow | null>(null)

  const footer = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <WorkOrderFilesRefreshButton
        disabled={panel.isFetching}
        isRefreshing={panel.isFetching}
        onClick={() => void panel.refresh()}
      />
      <WorkOrderFilesGenerateButton
        disabled={panel.isGenerating}
        isGenerating={panel.isGenerating}
        onClick={() => void panel.generate()}
      />
    </div>
  )

  return (
    <>
      <SidePanelPreview
        open={open}
        side="right"
        onClose={onClose}
        title="Files"
        widthClassName="w-[34rem]"
        footer={footer}
      >
        {panel.error ? (
          <div className="mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-800">
            {panel.error}
          </div>
        ) : null}

        {panel.isLoading ? (
          <div className="rounded-md border border-dashed border-[var(--panel-border)] px-3 py-6 text-center text-xs text-[var(--foreground)]/55">
            Loading files…
          </div>
        ) : panel.files.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--panel-border)] px-3 py-6 text-center text-xs text-[var(--foreground)]/55">
            No files yet. Click Generate to create one.
          </div>
        ) : (
          <div className="rounded-md border border-[var(--panel-border)]">
            {panel.files.map((file) => (
              <WorkOrderFilesRow
                key={file.id}
                file={file}
                isDeleting={panel.isDeleting && panel.deletingId === file.id}
                onDownload={() => void panel.openDownload(file.id)}
                onDelete={() => setPendingDelete(file)}
              />
            ))}
          </div>
        )}
      </SidePanelPreview>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete file?"
        message={
          pendingDelete
            ? `Delete ${formatFileNumber(pendingDelete.fileNumber)}? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={() => {
          if (pendingDelete) {
            void panel.deleteFile(pendingDelete.id)
          }
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
