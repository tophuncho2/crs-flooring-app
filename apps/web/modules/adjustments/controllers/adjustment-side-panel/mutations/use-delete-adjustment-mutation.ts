"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"
import { useMutation } from "@tanstack/react-query"
import type { InventoryAdjustmentRow } from "@builders/domain"
import {
  deletePendingAdjustmentRequest,
  type AdjustmentScopeUrl,
} from "@/modules/adjustments/data/mutations"
import type { AdjustmentEditPanelOpenSpec, AdjustmentPanelPatch } from "../types"

type Deps = {
  scope: AdjustmentScopeUrl
  publish: (patch: AdjustmentPanelPatch) => void
  setOpen: Dispatch<SetStateAction<AdjustmentEditPanelOpenSpec | null>>
  setError: Dispatch<SetStateAction<RecordSectionError | null>>
}

/**
 * Delete-pending mutation. Allowed only on PENDING rows (server-enforced);
 * closes the panel on success and emits a "delete" patch so the parent
 * removes the row from its snapshot.
 */
export function useDeleteAdjustmentMutation({
  scope,
  publish,
  setOpen,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: { workOrderItemId: string | null; adjustment: InventoryAdjustmentRow }) =>
      deletePendingAdjustmentRequest({
        scope,
        adjustmentId: input.adjustment.id,
        expectedUpdatedAt: input.adjustment.updatedAt,
      }),
    onSuccess: (_response, variables) => {
      publish({
        kind: "delete",
        reason: "removed",
        workOrderItemId: variables.workOrderItemId,
        adjustmentId: variables.adjustment.id,
      })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to delete adjustment" }))
    },
  })
}
