"use client"

import { useMutation } from "@tanstack/react-query"
import { voidWorkOrderCutLogRequest } from "@/modules/work-orders/data/mutations"

/**
 * Synchronous single-row void.
 *
 * Calls the DELETE route, returns the voided row. No worker, no
 * polling. Per locked decision #1, void does NOT flip the parent
 * WOMI's status.
 */
export function useWorkOrderCutLogVoid(args: { workOrderId: string }) {
  const voidMutation = useMutation({
    mutationFn: async (cutLogId: string) =>
      voidWorkOrderCutLogRequest({ workOrderId: args.workOrderId, cutLogId }),
  })

  return {
    isVoiding: voidMutation.isPending,
    voidingId: voidMutation.variables ?? null,
    error: voidMutation.error?.message ?? null,
    voidCutLog: (cutLogId: string) => voidMutation.mutateAsync(cutLogId),
  }
}
