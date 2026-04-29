"use client"

import { useCallback, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import type {
  WorkOrderCutLogPendingDelete,
  WorkOrderCutLogPendingDiff,
  WorkOrderCutLogPendingDraft,
  WorkOrderCutLogPendingUpdate,
} from "@builders/application"
import { saveWorkOrderItemPendingCutLogDiffRequest } from "@/modules/work-orders/data/mutations"

export type PendingCutLogRow = {
  id: string
  cutLogNumber: string
  status: "PENDING" | "QUEUED" | "FINAL" | "VOID"
  isFinal: boolean
  inventoryId: string
  before: string
  cut: string
  after: string
  coverageCut: string
  isWaste: boolean
  notes: string
  finalCutSequence: number | null
  updatedAt: string
}

type LocalDraft = {
  clientId: string
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
  // UI-only — narrows the inventory dropdown.
  locationFilterCode: string
}

type LocalUpdate = {
  serverId: string
  expectedUpdatedAt: string
  cut: string
  isWaste: boolean
  notes: string
  // UI-only.
  locationFilterCode: string
}

type LocalDelete = {
  serverId: string
  expectedUpdatedAt: string
}

/**
 * Per-WOMI pending cut-log diff controller.
 *
 * Maintains three local lists: drafts (new rows), updates (edited
 * existing rows), deletes (removed existing rows). On save() builds
 * the diff payload and POSTs to the producer route. The route is 202
 * async — returns `{ batch: { outboxEventId, wasDuplicate, tempIdMap } }`.
 *
 * The controller does NOT poll for worker completion; the parent
 * panel may re-fetch the work order detail on a polling schedule.
 *
 * Cost + freight are intentionally absent — WO-side cut logs always
 * write null per locked decision #3 of the master plan.
 */
export function useWorkOrderItemPendingCutLogs(args: {
  workOrderId: string
  workOrderItemId: string
  initialServerRows: PendingCutLogRow[]
}) {
  const [drafts, setDrafts] = useState<LocalDraft[]>([])
  const [updates, setUpdates] = useState<Record<string, LocalUpdate>>({})
  const [deletes, setDeletes] = useState<Record<string, LocalDelete>>({})

  const isDirty =
    drafts.length > 0 || Object.keys(updates).length > 0 || Object.keys(deletes).length > 0

  const addDraft = useCallback(() => {
    setDrafts((prev) => [
      ...prev,
      {
        clientId: crypto.randomUUID(),
        inventoryId: "",
        cut: "",
        isWaste: false,
        notes: "",
        locationFilterCode: "",
      },
    ])
  }, [])

  const updateDraft = useCallback(
    (clientId: string, patch: Partial<LocalDraft>) => {
      setDrafts((prev) =>
        prev.map((d) => (d.clientId === clientId ? { ...d, ...patch } : d)),
      )
    },
    [],
  )

  const removeDraft = useCallback((clientId: string) => {
    setDrafts((prev) => prev.filter((d) => d.clientId !== clientId))
  }, [])

  const editServerRow = useCallback(
    (row: PendingCutLogRow, patch: Partial<{ cut: string; isWaste: boolean; notes: string; locationFilterCode: string }>) => {
      setUpdates((prev) => ({
        ...prev,
        [row.id]: {
          serverId: row.id,
          expectedUpdatedAt: row.updatedAt,
          cut: prev[row.id]?.cut ?? row.cut,
          isWaste: prev[row.id]?.isWaste ?? row.isWaste,
          notes: prev[row.id]?.notes ?? row.notes,
          locationFilterCode: prev[row.id]?.locationFilterCode ?? "",
          ...patch,
        },
      }))
    },
    [],
  )

  const deleteServerRow = useCallback((row: PendingCutLogRow) => {
    setDeletes((prev) => ({
      ...prev,
      [row.id]: { serverId: row.id, expectedUpdatedAt: row.updatedAt },
    }))
    // Drop any pending update for the same row.
    setUpdates((prev) => {
      const { [row.id]: _drop, ...rest } = prev
      return rest
    })
  }, [])

  const undoDelete = useCallback((rowId: string) => {
    setDeletes((prev) => {
      const { [rowId]: _drop, ...rest } = prev
      return rest
    })
  }, [])

  const discard = useCallback(() => {
    setDrafts([])
    setUpdates({})
    setDeletes({})
  }, [])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const draftPayloads: WorkOrderCutLogPendingDraft[] = drafts.map((d) => ({
        tempId: d.clientId,
        inventoryId: d.inventoryId,
        cut: d.cut,
        isWaste: d.isWaste,
        notes: d.notes,
      }))
      const modifiedPayloads: WorkOrderCutLogPendingUpdate[] = Object.values(updates).map((u) => ({
        id: u.serverId,
        expectedUpdatedAt: u.expectedUpdatedAt,
        patch: {
          cut: u.cut,
          isWaste: u.isWaste,
          notes: u.notes,
        },
      }))
      const deletedPayloads: WorkOrderCutLogPendingDelete[] = Object.values(deletes).map((d) => ({
        id: d.serverId,
        expectedUpdatedAt: d.expectedUpdatedAt,
      }))
      const diff: WorkOrderCutLogPendingDiff = {
        added: draftPayloads,
        modified: modifiedPayloads,
        deleted: deletedPayloads,
      }
      return saveWorkOrderItemPendingCutLogDiffRequest({
        workOrderId: args.workOrderId,
        workOrderItemId: args.workOrderItemId,
        requestKey: crypto.randomUUID(),
        diff,
      })
    },
    onSuccess: () => {
      // Worker will apply asynchronously. Reset local state.
      discard()
    },
  })

  return {
    drafts,
    updates,
    deletes,
    isDirty,
    isSaving: saveMutation.isPending,
    error: saveMutation.error?.message ?? null,
    addDraft,
    updateDraft,
    removeDraft,
    editServerRow,
    deleteServerRow,
    undoDelete,
    discard,
    save: () => saveMutation.mutateAsync(),
  }
}
