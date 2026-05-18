"use client"

import type { Dispatch, SetStateAction } from "react"
import { useMutation } from "@tanstack/react-query"
import type { CutLogRow } from "@builders/domain"
import {
  updatePendingCutLogRequest,
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
 * Update-pending mutation. Stays open on success and refreshes the form +
 * baseline to the server-fresh row. Mutation responses come back as plain
 * `CutLogRow` — the WO/WOMI labels (`workOrderNumber`,
 * `workOrderItemProductLabel`) are carried forward from the prior snapshot
 * so the panel's read-only cells stay populated. A pending-edit can't
 * change the WO link, so those labels remain accurate.
 */
export function useUpdateCutLogMutation({
  scope,
  publish,
  setForm,
  setBaseline,
  setOpen,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: {
      workOrderItemId: string | null
      cutLog: CutLogRow
      form: CutLogEditForm
    }) =>
      updatePendingCutLogRequest({
        scope,
        cutLogId: input.cutLog.id,
        expectedUpdatedAt: input.cutLog.updatedAt,
        patch: {
          cut: input.form.cut,
          isWaste: input.form.isWaste,
          notes: input.form.notes,
        },
      }),
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
        },
      }))
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })
}
