"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"
import { useMutation } from "@tanstack/react-query"
import type { InventoryAdjustmentRow } from "@builders/domain"
import {
  deletePendingCutLogRequest,
  type CutLogScopeUrl,
} from "@/modules/cut-logs/data/mutations"
import type { CutLogEditPanelOpenSpec, CutLogPanelPatch } from "../types"

type Deps = {
  scope: CutLogScopeUrl
  publish: (patch: CutLogPanelPatch) => void
  setOpen: Dispatch<SetStateAction<CutLogEditPanelOpenSpec | null>>
  setError: Dispatch<SetStateAction<RecordSectionError | null>>
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
    mutationFn: (input: { workOrderItemId: string | null; cutLog: InventoryAdjustmentRow }) =>
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
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to delete cut log" }))
    },
  })
}
