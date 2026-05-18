"use client"

import type { Dispatch, SetStateAction } from "react"
import { useMutation } from "@tanstack/react-query"
import type { CutLogRow } from "@builders/domain"
import {
  finalizeCutLogRequest,
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
 * Finalize mutation. Closes the panel on success; the new FINAL row is
 * upserted into the parent snapshot via the standard `publish` patch.
 */
export function useFinalizeCutLogMutation({
  scope,
  publish,
  setOpen,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: { workOrderItemId: string | null; cutLog: CutLogRow }) =>
      finalizeCutLogRequest({ scope, cutLogId: input.cutLog.id }),
    onSuccess: (response, variables) => {
      publish({
        kind: "upsert",
        workOrderItemId: variables.workOrderItemId,
        cutLog: response.cutLog,
      })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })
}
