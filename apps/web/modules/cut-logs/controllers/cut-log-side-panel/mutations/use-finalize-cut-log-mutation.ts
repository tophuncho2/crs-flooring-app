"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"
import { useMutation } from "@tanstack/react-query"
import type { InventoryAdjustmentRow } from "@builders/domain"
import {
  finalizeCutLogRequest,
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
 * Finalize mutation. Stays open on success — the now-FINAL row replaces
 * the prior PENDING row in the panel state and the form/baseline reset
 * to the server-fresh values. The cut log is no longer pending-editable
 * after this, so the panel's input cells go read-only via
 * `isAdjustmentPendingEditable`. The standard `publish` patch upserts the
 * new row into the parent snapshot. The WO/WOMI + warehouse labels are
 * carried forward from the prior open spec so the read-only cells stay
 * populated (the response is a plain `InventoryAdjustmentRow` with no joined labels).
 */
export function useFinalizeCutLogMutation({
  scope,
  publish,
  setForm,
  setBaseline,
  setOpen,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: { workOrderItemId: string | null; cutLog: InventoryAdjustmentRow }) =>
      finalizeCutLogRequest({ scope, cutLogId: input.cutLog.id }),
    onSuccess: (response, variables) => {
      publish({
        kind: "upsert",
        workOrderItemId: variables.workOrderItemId,
        cutLog: response.cutLog,
      })
      const next = buildEditForm(response.cutLog)
      setForm(next)
      setBaseline(next)
      setOpen((prev) => ({
        mode: "edit",
        workOrderItemId: variables.workOrderItemId,
        cutLog: {
          ...response.cutLog,
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
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to finalize cut log" }))
    },
  })
}
