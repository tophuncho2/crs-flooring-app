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
import type { AdjustmentEditOpenSpec, AdjustmentEditPatch } from "../types"

type Deps = {
  scope: AdjustmentScopeUrl
  publish: (patch: AdjustmentEditPatch) => void
  setOpen: Dispatch<SetStateAction<AdjustmentEditOpenSpec | null>>
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
    mutationFn: (input: { adjustment: InventoryAdjustmentRow }) =>
      deletePendingAdjustmentRequest({
        scope,
        adjustmentId: input.adjustment.id,
        expectedUpdatedAt: input.adjustment.updatedAt,
      }),
    onSuccess: (_response, variables) => {
      publish({
        kind: "delete",
        adjustmentId: variables.adjustment.id,
      })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to delete adjustment" }))
    },
  })
}
