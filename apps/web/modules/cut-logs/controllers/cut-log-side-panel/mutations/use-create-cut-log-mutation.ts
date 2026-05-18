"use client"

import type { Dispatch, SetStateAction } from "react"
import { useMutation } from "@tanstack/react-query"
import {
  createPendingCutLogRequest,
  type CutLogScopeUrl,
} from "@/modules/cut-logs/data/mutations"
import { buildEditForm } from "../form"
import type {
  CutLogEditForm,
  CutLogEditPanelOpenSpec,
  CutLogPanelPatch,
} from "../types"

type Deps = {
  scope: CutLogScopeUrl
  publish: (patch: CutLogPanelPatch) => void
  setForm: Dispatch<SetStateAction<CutLogEditForm>>
  setBaseline: Dispatch<SetStateAction<CutLogEditForm>>
  setOpen: Dispatch<SetStateAction<CutLogEditPanelOpenSpec | null>>
  setError: Dispatch<SetStateAction<string | null>>
}

/**
 * Create-pending mutation. WO-only — the inventory side never reaches this
 * path because `canCreate` is false there. On success transitions the panel
 * from create → edit on the newly-created row so the operator can finalize
 * or tweak without reopening the panel.
 */
export function useCreateCutLogMutation({
  scope,
  publish,
  setForm,
  setBaseline,
  setOpen,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: { workOrderItemId: string; form: CutLogEditForm }) => {
      // Runtime guard surfaces misuse as a clear error.
      if (scope.kind !== "work-order") {
        throw new Error(
          "createPendingCutLogRequest requires a work-order scope; canCreate must only be true on WO callers.",
        )
      }
      return createPendingCutLogRequest({
        workOrderId: scope.workOrderId,
        workOrderItemId: input.workOrderItemId,
        inventoryId: input.form.inventoryId,
        cut: input.form.cut,
        isWaste: input.form.isWaste,
        notes: input.form.notes,
      })
    },
    onSuccess: (response, variables) => {
      publish({
        kind: "upsert",
        workOrderItemId: variables.workOrderItemId,
        cutLog: response.cutLog,
      })
      const next = buildEditForm(response.cutLog)
      setForm(next)
      setBaseline(next)
      setOpen({
        mode: "edit",
        workOrderItemId: variables.workOrderItemId,
        cutLog: response.cutLog,
      })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })
}
