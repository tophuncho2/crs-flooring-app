"use client"

import { useMutation } from "@tanstack/react-query"
import type { InventoryAdjustmentRow } from "@builders/domain"
import {
  deletePendingAdjustmentRequest,
  type AdjustmentScopeUrl,
} from "@/modules/adjustments/data/mutations"

type Deps = {
  scope: AdjustmentScopeUrl
  /** Fired after a successful delete with the removed row's id. */
  onDeleted?: (deletedId: string) => void
  /** Fired on failure with the raw error (host decides how to surface it). */
  onError?: (error: unknown) => void
}

/**
 * The one delete-pending mutation, shared by every surface that removes a PENDING
 * adjustment: the record-view edit panel, the inventory record adjustments list,
 * and the work-order record adjustments grid. Scope-aware (work-order vs inventory
 * route); deletion is server-enforced to PENDING rows. Behaviour beyond the
 * request — clearing edit state, refreshing a list, reconciling balances — is the
 * host's via `onDeleted` / `onError`, so the hook stays surface-agnostic.
 */
export function useDeleteAdjustmentMutation({ scope, onDeleted, onError }: Deps) {
  return useMutation({
    mutationFn: (input: { adjustment: InventoryAdjustmentRow }) =>
      deletePendingAdjustmentRequest({
        scope,
        adjustmentId: input.adjustment.id,
        expectedUpdatedAt: input.adjustment.updatedAt,
      }),
    onSuccess: (_response, variables) => onDeleted?.(variables.adjustment.id),
    onError: (error: unknown) => onError?.(error),
  })
}
