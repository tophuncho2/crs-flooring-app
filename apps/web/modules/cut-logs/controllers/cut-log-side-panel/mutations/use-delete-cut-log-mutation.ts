"use client"

import type { Dispatch, SetStateAction } from "react"
import { useMutation } from "@tanstack/react-query"
import type { CutLogRow } from "@builders/domain"
import {
  deletePendingCutLogRequest,
  type CutLogScopeUrl,
} from "@/modules/cut-logs/data/mutations"
import type { CutLogEditPanelOpenSpec, CutLogPanelPatch } from "../types"

type Deps = {
  scope: CutLogScopeUrl
  publish: (patch: CutLogPanelPatch) => void
  setOpen: Dispatch<SetStateAction<CutLogEditPanelOpenSpec | null>>
  setError: Dispatch<SetStateAction<string | null>>
}

/**
 * Delete-pending mutation. Allowed only on PENDING rows (server-enforced);
 * closes the panel on success and emits a "delete" patch so the parent
 * removes the row from its snapshot.
 */
export function useDeleteCutLogMutation({
  scope,
  publish,
  setOpen,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: { workOrderItemId: string | null; cutLog: CutLogRow }) =>
      deletePendingCutLogRequest({
        scope,
        cutLogId: input.cutLog.id,
        expectedUpdatedAt: input.cutLog.updatedAt,
      }),
    onSuccess: (_response, variables) => {
      publish({
        kind: "delete",
        workOrderItemId: variables.workOrderItemId,
        cutLogId: variables.cutLog.id,
      })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })
}
