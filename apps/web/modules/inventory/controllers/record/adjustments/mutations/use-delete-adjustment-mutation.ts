"use client"

import { useMutation } from "@tanstack/react-query"
import type { InventoryAdjustmentRow } from "@builders/domain"
import { deletePendingAdjustmentRequest } from "@/modules/adjustments/data/mutations"

type Deps = {
  /** Fired after a successful delete with the removed row's id. */
  onDeleted?: (deletedId: string) => void
  /** Fired on failure with the raw error (host decides how to surface it). */
  onError?: (error: unknown) => void
}

/**
 * The one delete-pending mutation, shared by every surface that removes a PENDING
 * adjustment: the record-view edit panel, the inventory record adjustments list,
 * and the work-order record adjustments grid. Every delete targets the row's own
 * **inventory** route — the sole adjustment-mutation surface (mirrors create,
 * which always posts to the inventory route); there is no work-order-scoped
 * adjustment route. Behaviour beyond the request — clearing edit state, refreshing
 * a list, reconciling balances — is the host's via `onDeleted` / `onError`.
 */
export function useDeleteAdjustmentMutation({ onDeleted, onError }: Deps = {}) {
  return useMutation({
    mutationFn: (input: { adjustment: InventoryAdjustmentRow }) =>
      deletePendingAdjustmentRequest({
        scope: { kind: "inventory", inventoryId: input.adjustment.inventoryId },
        adjustmentId: input.adjustment.id,
        expectedUpdatedAt: input.adjustment.updatedAt,
      }),
    onSuccess: (_response, variables) => onDeleted?.(variables.adjustment.id),
    onError: (error: unknown) => onError?.(error),
  })
}
