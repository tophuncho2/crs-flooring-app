"use client"

import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { WorkOrderFileRow } from "@/modules/work-orders/data/queries"
import {
  deleteWorkOrderFileRequest,
  getWorkOrderFileDownloadUrlRequest,
  listWorkOrderFilesRequest,
  requestWorkOrderFileRequest,
} from "@/modules/work-orders/data/mutations"

const WORK_ORDER_FILES_QUERY_KEY = ["work-order-files"] as const

/**
 * Files side-panel controller. Mirrors template-sync's freshness model:
 * `staleTime: 0, gcTime: 0` so the list refetches on every panel open
 * and the cache is dropped on close. The query is gated by `enabled`
 * (the panel's open flag) so it doesn't fire while the panel is shut.
 *
 * Generate (POST 202) and Delete (DELETE 200) mutations invalidate the
 * list so the row state reflects the worker outcome. `openDownload` is
 * imperative — fetches a presigned URL and opens it in a new tab.
 */
export function useWorkOrderFilesPanel({
  workOrderId,
  enabled,
}: {
  workOrderId: string
  enabled: boolean
}) {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)

  const queryKey = useMemo(
    () => [...WORK_ORDER_FILES_QUERY_KEY, workOrderId] as const,
    [workOrderId],
  )

  const filesQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => listWorkOrderFilesRequest(workOrderId, signal),
    enabled,
    staleTime: 0,
    gcTime: 0,
  })

  const generateMutation = useMutation({
    mutationFn: () => requestWorkOrderFileRequest(workOrderId),
    onSuccess: async () => {
      setActionError(null)
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (error: Error) => setActionError(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => deleteWorkOrderFileRequest(workOrderId, fileId),
    onSuccess: async () => {
      setActionError(null)
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (error: Error) => setActionError(error.message),
  })

  const refresh = useCallback(async () => {
    setActionError(null)
    await queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const openDownload = useCallback(
    async (fileId: string) => {
      try {
        const { url } = await getWorkOrderFileDownloadUrlRequest({
          workOrderId,
          fileId,
        })
        if (typeof window !== "undefined") {
          window.open(url, "_blank", "noopener,noreferrer")
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Failed to open download")
      }
    },
    [workOrderId],
  )

  const files: WorkOrderFileRow[] = filesQuery.data?.files ?? []
  const queryError = filesQuery.error instanceof Error ? filesQuery.error.message : null
  const error = actionError ?? queryError

  return {
    files,
    isLoading: filesQuery.isLoading,
    isFetching: filesQuery.isFetching,
    isGenerating: generateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    deletingId: deleteMutation.variables ?? null,
    error,
    refresh,
    generate: () => generateMutation.mutateAsync(),
    deleteFile: (fileId: string) => deleteMutation.mutateAsync(fileId),
    openDownload,
  }
}
