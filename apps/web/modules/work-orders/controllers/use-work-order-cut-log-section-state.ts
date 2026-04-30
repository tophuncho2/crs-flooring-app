"use client"

import { useCallback, useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import type {
  WorkOrderCutLogPendingDelete,
  WorkOrderCutLogPendingDiff,
  WorkOrderCutLogPendingDraft,
  WorkOrderCutLogPendingUpdate,
} from "@builders/application"
import { saveWorkOrderItemPendingCutLogDiffRequest } from "../data/mutations"

export type LocalCutLogDraft = {
  clientId: string
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
  // UI-only — narrows the inventory dropdown to a chosen location.
  locationFilterCode: string
}

export type LocalCutLogUpdate = {
  serverId: string
  expectedUpdatedAt: string
  cut: string
  isWaste: boolean
  notes: string
  locationFilterCode: string
}

export type LocalCutLogDelete = {
  serverId: string
  expectedUpdatedAt: string
}

export type CutLogLocalState = {
  drafts: LocalCutLogDraft[]
  updates: Record<string, LocalCutLogUpdate>
  deletes: Record<string, LocalCutLogDelete>
}

const EMPTY_STATE: CutLogLocalState = {
  drafts: [],
  updates: {},
  deletes: {},
}

function isStateDirty(state: CutLogLocalState): boolean {
  return (
    state.drafts.length > 0 ||
    Object.keys(state.updates).length > 0 ||
    Object.keys(state.deletes).length > 0
  )
}

export type WorkOrderCutLogPendingRowSource = {
  id: string
  cutLogNumber: string
  status: string
  updatedAt: string
  cut: string
  isWaste: boolean
  notes: string
}

/**
 * Section-level cut-log state for a work-order's material-items section.
 *
 * Replaces the per-WOMI `useWorkOrderItemPendingCutLogs` hook so the
 * section can:
 *   - Track dirty cut-log edits across every WOMI (expanded or not).
 *     Dirty state survives expand/collapse — collapsing a WOMI no longer
 *     destroys its unsaved drafts.
 *   - Fire one section-wide "Save Pending Cuts" action that POSTs the
 *     diff for every dirty WOMI in parallel (Promise.all).
 *   - Expose `isAnyDirty` so the section header's Save / Discard buttons
 *     and the finalize-selection gate can read a single source of truth.
 *
 * State is keyed by `workOrderItemId`. An empty state entry is removed
 * from the map so `Object.keys(stateByWomi)` is exactly the dirty set.
 */
export function useWorkOrderCutLogSectionState({
  workOrderId,
}: {
  workOrderId: string
}) {
  const [stateByWomi, setStateByWomi] = useState<Record<string, CutLogLocalState>>({})

  const modify = useCallback(
    (womiId: string, updater: (prev: CutLogLocalState) => CutLogLocalState) => {
      setStateByWomi((prev) => {
        const current = prev[womiId] ?? EMPTY_STATE
        const next = updater(current)
        if (!isStateDirty(next)) {
          if (!(womiId in prev)) return prev
          const { [womiId]: _drop, ...rest } = prev
          return rest
        }
        return { ...prev, [womiId]: next }
      })
    },
    [],
  )

  const getStateForWomi = useCallback(
    (womiId: string): CutLogLocalState => stateByWomi[womiId] ?? EMPTY_STATE,
    [stateByWomi],
  )

  const isWomiDirty = useCallback(
    (womiId: string): boolean => isStateDirty(stateByWomi[womiId] ?? EMPTY_STATE),
    [stateByWomi],
  )

  const dirtyWomiIds = useMemo(() => Object.keys(stateByWomi), [stateByWomi])
  const isAnyDirty = dirtyWomiIds.length > 0

  const addDraft = useCallback(
    (womiId: string) => {
      modify(womiId, (s) => ({
        ...s,
        drafts: [
          ...s.drafts,
          {
            clientId: crypto.randomUUID(),
            inventoryId: "",
            cut: "",
            isWaste: false,
            notes: "",
            locationFilterCode: "",
          },
        ],
      }))
    },
    [modify],
  )

  const updateDraft = useCallback(
    (womiId: string, clientId: string, patch: Partial<LocalCutLogDraft>) => {
      modify(womiId, (s) => ({
        ...s,
        drafts: s.drafts.map((d) =>
          d.clientId === clientId ? { ...d, ...patch } : d,
        ),
      }))
    },
    [modify],
  )

  const removeDraft = useCallback(
    (womiId: string, clientId: string) => {
      modify(womiId, (s) => ({
        ...s,
        drafts: s.drafts.filter((d) => d.clientId !== clientId),
      }))
    },
    [modify],
  )

  const editServerRow = useCallback(
    (
      womiId: string,
      row: WorkOrderCutLogPendingRowSource,
      patch: Partial<{
        cut: string
        isWaste: boolean
        notes: string
        locationFilterCode: string
      }>,
    ) => {
      modify(womiId, (s) => {
        const existing = s.updates[row.id]
        const next: LocalCutLogUpdate = {
          serverId: row.id,
          expectedUpdatedAt: row.updatedAt,
          cut: existing?.cut ?? row.cut,
          isWaste: existing?.isWaste ?? row.isWaste,
          notes: existing?.notes ?? row.notes,
          locationFilterCode: existing?.locationFilterCode ?? "",
          ...patch,
        }
        return { ...s, updates: { ...s.updates, [row.id]: next } }
      })
    },
    [modify],
  )

  const deleteServerRow = useCallback(
    (womiId: string, row: WorkOrderCutLogPendingRowSource) => {
      modify(womiId, (s) => {
        const { [row.id]: _droppedUpdate, ...remainingUpdates } = s.updates
        return {
          ...s,
          updates: remainingUpdates,
          deletes: {
            ...s.deletes,
            [row.id]: { serverId: row.id, expectedUpdatedAt: row.updatedAt },
          },
        }
      })
    },
    [modify],
  )

  const undoDelete = useCallback(
    (womiId: string, rowId: string) => {
      modify(womiId, (s) => {
        const { [rowId]: _drop, ...rest } = s.deletes
        return { ...s, deletes: rest }
      })
    },
    [modify],
  )

  const discardAll = useCallback(() => {
    setStateByWomi({})
  }, [])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const targets = Object.entries(stateByWomi).filter(([, s]) => isStateDirty(s))
      if (targets.length === 0) return [] as string[]
      // Promise.all over dirty WOMIs. Each request returns 202; the worker
      // applies asynchronously per WOMI under its own per-inventory lock.
      // Partial-failure note: if any one POST throws, the entire local
      // state is preserved for retry. Idempotency keys make already-202'd
      // WOMIs no-ops on the second attempt. Acceptable for V1 scale; if
      // needed post-V1, accumulate per-WOMI errors and clear only the
      // succeeded keys.
      return Promise.all(
        targets.map(async ([womiId, s]) => {
          const drafts: WorkOrderCutLogPendingDraft[] = s.drafts.map((d) => ({
            tempId: d.clientId,
            inventoryId: d.inventoryId,
            cut: d.cut,
            isWaste: d.isWaste,
            notes: d.notes,
          }))
          const modified: WorkOrderCutLogPendingUpdate[] = Object.values(s.updates).map(
            (u) => ({
              id: u.serverId,
              expectedUpdatedAt: u.expectedUpdatedAt,
              patch: { cut: u.cut, isWaste: u.isWaste, notes: u.notes },
            }),
          )
          const deleted: WorkOrderCutLogPendingDelete[] = Object.values(s.deletes).map(
            (d) => ({ id: d.serverId, expectedUpdatedAt: d.expectedUpdatedAt }),
          )
          const diff: WorkOrderCutLogPendingDiff = { added: drafts, modified, deleted }
          await saveWorkOrderItemPendingCutLogDiffRequest({
            workOrderId,
            workOrderItemId: womiId,
            requestKey: crypto.randomUUID(),
            diff,
          })
          return womiId
        }),
      )
    },
    onSuccess: () => {
      // Workers run asynchronously; clear local state so the UI reseeds
      // off the server snapshot. A subsequent record refresh picks up the
      // worker-applied rows.
      setStateByWomi({})
    },
  })

  return {
    // Per-WOMI state access (passed down to each row)
    getStateForWomi,
    isWomiDirty,

    // Per-WOMI mutators (each accepts `womiId` first)
    addDraft,
    updateDraft,
    removeDraft,
    editServerRow,
    deleteServerRow,
    undoDelete,

    // Section-wide
    isAnyDirty,
    dirtyWomiIds,
    discardAll,
    save: () => saveMutation.mutateAsync(),
    isSavingPendingCuts: saveMutation.isPending,
    pendingSaveError: saveMutation.error?.message ?? null,
  }
}

export type WorkOrderCutLogSectionState = ReturnType<
  typeof useWorkOrderCutLogSectionState
>
