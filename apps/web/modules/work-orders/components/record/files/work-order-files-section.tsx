"use client"

import { StatusBadge } from "@/components/badges"
import { useWorkOrderFilesSection } from "@/modules/work-orders/controllers/use-work-order-files-section"
import type { WorkOrderFileRow } from "@/modules/work-orders/data/queries"

function statusTone(status: WorkOrderFileRow["status"]) {
  switch (status) {
    case "COMPLETED":
      return "success"
    case "WORKING":
      return "processing"
    case "QUEUED":
      return "warning"
    case "FAILED":
      return "error"
    default:
      return "muted"
  }
}

export function WorkOrderFilesSection({
  workOrderId,
  initialFiles,
}: {
  workOrderId: string
  initialFiles: WorkOrderFileRow[]
}) {
  const files = useWorkOrderFilesSection({ workOrderId, initialFiles })

  return (
    <section className="space-y-3 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Files</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-[var(--panel-border)] px-2 py-1 text-xs hover:bg-[var(--panel-border)]/10"
            onClick={() => void files.refresh()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            onClick={() => void files.requestFile()}
            disabled={files.isRequesting}
          >
            {files.isRequesting ? "Generating…" : "Generate File"}
          </button>
        </div>
      </div>

      {files.error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-800">
          {files.error}
        </div>
      ) : null}

      {files.files.length === 0 ? (
        <div className="rounded border border-dashed border-[var(--panel-border)] px-3 py-4 text-center text-xs text-[var(--foreground)]/55">
          No files yet. Click "Generate File" to create one.
        </div>
      ) : (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--panel-border)]">
              <th className="px-2 py-1 text-left">File #</th>
              <th className="px-2 py-1 text-center">Status</th>
              <th className="px-2 py-1 text-left">Created</th>
              <th className="px-2 py-1 text-left">Completed</th>
              <th className="px-2 py-1 text-left">Error</th>
              <th className="w-32 px-2 py-1 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {files.files.map((file) => (
              <tr key={file.id} className="border-b border-[var(--panel-border)]/40">
                <td className="px-2 py-1">
                  WO-FILE-{String(file.fileNumber).padStart(3, "0")}
                </td>
                <td className="px-2 py-1 text-center">
                  <StatusBadge tone={statusTone(file.status)}>{file.status}</StatusBadge>
                </td>
                <td className="px-2 py-1">{file.createdAt.toString().slice(0, 19).replace("T", " ")}</td>
                <td className="px-2 py-1">
                  {file.completedAt
                    ? file.completedAt.toString().slice(0, 19).replace("T", " ")
                    : "—"}
                </td>
                <td className="px-2 py-1 text-rose-700">{file.errorMessage || ""}</td>
                <td className="px-2 py-1 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {file.status === "COMPLETED" && file.fileKey ? (
                      <button
                        type="button"
                        className="rounded border border-[var(--panel-border)] px-2 py-1 hover:bg-[var(--panel-border)]/10"
                        onClick={() => void files.openDownload(file.id)}
                      >
                        Download
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="text-rose-600 hover:underline disabled:opacity-50"
                      disabled={files.isDeleting && files.deletingId === file.id}
                      onClick={() => {
                        if (window.confirm("Delete this file?")) {
                          void files.deleteFile(file.id)
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
