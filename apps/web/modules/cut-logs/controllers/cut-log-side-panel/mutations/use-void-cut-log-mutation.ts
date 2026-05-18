"use client"

import type { Dispatch, SetStateAction } from "react"
import { useMutation } from "@tanstack/react-query"
import type { CutLogRow, FlooringCutLogStatus } from "@builders/domain"
import {
  voidCutLogRequest,
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
 * Void mutation. Server returns the full voided row (link cols + `location`
 * cleared, status flipped to VOID). Falls back to an optimistic patch if
 * the server response is ever shaped without the row (defensive).
 */
export function useVoidCutLogMutation({
  scope,
  publish,
  setOpen,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: { workOrderItemId: string | null; cutLog: CutLogRow }) =>
      voidCutLogRequest({ scope, cutLogId: input.cutLog.id }),
    onSuccess: (response, variables) => {
      const voided: CutLogRow =
        response.cutLog ??
        ({
          ...variables.cutLog,
          cut: "0",
          coverageCut: null,
          void: true,
          status: "VOID" as FlooringCutLogStatus,
        } satisfies CutLogRow)
      publish({
        kind: "upsert",
        workOrderItemId: variables.workOrderItemId,
        cutLog: voided,
      })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })
}
