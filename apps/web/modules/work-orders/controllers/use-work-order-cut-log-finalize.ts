"use client"

import { useCallback, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { finalizeWorkOrderCutLogBatchRequest } from "@/modules/work-orders/data/mutations"

/**
 * WO-scoped batch-select controller for the finalize flow.
 *
 * Maintains a `Set<cutLogId>` across all expanded WOMI rows. The
 * MI section's ActionsPanel "Enter Finalize Mode" toggles
 * `isSelectionMode`, which exposes a checkbox column on every
 * PENDING cut-log row across every expanded WOMI. "Finalize Selected"
 * calls `submit()` which POSTs the cut log IDs + a fresh requestKey
 * to the producer route.
 *
 * Returns 202 — the worker applies asynchronously. Local state resets
 * on success.
 */
export function useWorkOrderCutLogFinalize(args: { workOrderId: string }) {
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true)
  }, [])

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

  const toggleSelection = useCallback((cutLogId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(cutLogId)) next.delete(cutLogId)
      else next.add(cutLogId)
      return next
    })
  }, [])

  const setSelected = useCallback((cutLogId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) next.add(cutLogId)
      else next.delete(cutLogId)
      return next
    })
  }, [])

  const submitMutation = useMutation({
    mutationFn: async () => {
      const cutLogIds = Array.from(selectedIds)
      if (cutLogIds.length === 0) {
        throw new Error("Select at least one cut log to finalize")
      }
      return finalizeWorkOrderCutLogBatchRequest({
        workOrderId: args.workOrderId,
        requestKey: crypto.randomUUID(),
        cutLogIds,
      })
    },
    onSuccess: () => {
      exitSelectionMode()
    },
  })

  return {
    isSelectionMode,
    selectedIds,
    selectedCount: selectedIds.size,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    setSelected,
    isSubmitting: submitMutation.isPending,
    error: submitMutation.error?.message ?? null,
    submit: () => submitMutation.mutateAsync(),
  }
}
