"use client"

import { useCallback, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import type { WorkOrderFileRow } from "@/modules/work-orders/data/queries"
import {
  deleteWorkOrderFileRequest,
  getWorkOrderFileDownloadUrlRequest,
  listWorkOrderFilesRequest,
  requestWorkOrderFileRequest,
} from "@/modules/work-orders/data/mutations"

/**
 * File section orchestration. Tracks the current file list locally so
 * the section UI can reflect new files appearing (after request) and
 * removed files (after delete) without a full page refresh.
 *
 * `requestFile` fires the producer route (202) — file row appears at
 * status QUEUED and updates async via the worker. `refresh()` re-pulls
 * the list so the UI can pick up COMPLETED state.
 *
 * `deleteFile` is sync (200). `openDownload` fetches a presigned URL
 * and opens it in a new tab.
 */
export function useWorkOrderFilesSection(args: {
  workOrderId: string
  initialFiles: WorkOrderFileRow[]
}) {
  const [files, setFiles] = useState<WorkOrderFileRow[]>(args.initialFiles)
  const [actionError, setActionError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const { files: next } = await listWorkOrderFilesRequest(args.workOrderId)
    setFiles(next)
  }, [args.workOrderId])

  const requestMutation = useMutation({
    mutationFn: async () => requestWorkOrderFileRequest(args.workOrderId),
    onSuccess: async () => {
      setActionError(null)
      await refresh()
    },
    onError: (error: Error) => setActionError(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) =>
      deleteWorkOrderFileRequest(args.workOrderId, fileId),
    onSuccess: async (_data, fileId) => {
      setActionError(null)
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
    },
    onError: (error: Error) => setActionError(error.message),
  })

  const openDownload = useCallback(
    async (fileId: string) => {
      try {
        const { url } = await getWorkOrderFileDownloadUrlRequest({
          workOrderId: args.workOrderId,
          fileId,
        })
        if (typeof window !== "undefined") {
          window.open(url, "_blank", "noopener,noreferrer")
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Failed to open download")
      }
    },
    [args.workOrderId],
  )

  return {
    files,
    isRequesting: requestMutation.isPending,
    isDeleting: deleteMutation.isPending,
    deletingId: deleteMutation.variables ?? null,
    error: actionError,
    requestFile: () => requestMutation.mutateAsync(),
    deleteFile: (fileId: string) => deleteMutation.mutateAsync(fileId),
    openDownload,
    refresh,
  }
}
