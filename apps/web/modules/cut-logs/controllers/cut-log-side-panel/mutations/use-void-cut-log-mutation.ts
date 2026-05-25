"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"
import { useMutation } from "@tanstack/react-query"
import type { CutLogRow, FlooringCutLogStatus } from "@builders/domain"
import {
  voidCutLogRequest,
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
  setError: Dispatch<SetStateAction<RecordSectionError | null>>
}

/**
 * Void mutation. Server returns the full voided row (link cols + `location`
 * cleared, status flipped to VOID). Falls back to an optimistic patch if
 * the server response is ever shaped without the row (defensive). Stays
 * open on success so the operator can see the VOID status reflected in
 * place — form/baseline reset to the server-fresh values; the cut log is
 * no longer pending-editable, so the panel's input cells go read-only
 * via `isCutLogPendingEditable`. WO/WOMI + warehouse labels are carried
 * forward from the prior open spec so the read-only cells stay populated.
 */
export function useVoidCutLogMutation({
  scope,
  publish,
  setForm,
  setBaseline,
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
      const next = buildEditForm(voided)
      setForm(next)
      setBaseline(next)
      setOpen((prev) => ({
        mode: "edit",
        workOrderItemId: variables.workOrderItemId,
        cutLog: {
          ...voided,
          workOrderNumber:
            prev?.mode === "edit" ? (prev.cutLog.workOrderNumber ?? null) : null,
          workOrderItemProductLabel:
            prev?.mode === "edit"
              ? (prev.cutLog.workOrderItemProductLabel ?? null)
              : null,
          warehouseName:
            prev?.mode === "edit" ? (prev.cutLog.warehouseName ?? null) : null,
        },
      }))
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to void cut log" }))
    },
  })
}
