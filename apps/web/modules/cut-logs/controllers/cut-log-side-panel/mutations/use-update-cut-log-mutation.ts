"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"
import { useMutation } from "@tanstack/react-query"
import { isCutLogPendingEditable, type CutLogRow } from "@builders/domain"
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
  setError: Dispatch<SetStateAction<RecordSectionError | null>>
}

/**
 * Update-pending mutation. Stays open on success and refreshes the form +
 * baseline to the server-fresh row. Mutation responses come back as plain
 * `CutLogRow` — the WO/WOMI labels (`workOrderNumber`,
 * `workOrderItemProductLabel`) and the warehouse label (`warehouseName`)
 * are carried forward from the prior snapshot so the panel's read-only
 * cells stay populated. A pending-edit can't change the WO link or the
 * warehouse snapshot, so those labels remain accurate.
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
    }) => {
      // FINAL rows lock `cut` / `notes` / `isWaste`; only the link is
      // mutable. Send those fields only when the row is still
      // PENDING-editable so the server gate (which separates field
      // patches from link patches) doesn't 409.
      const fieldsEditable = isCutLogPendingEditable(input.cutLog)
      const linkChanged =
        input.form.workOrderId !== input.cutLog.workOrderId ||
        input.form.workOrderItemId !== input.cutLog.workOrderItemId
      return updatePendingCutLogRequest({
        scope,
        cutLogId: input.cutLog.id,
        expectedUpdatedAt: input.cutLog.updatedAt,
        patch: {
          ...(fieldsEditable
            ? {
                cut: input.form.cut,
                isWaste: input.form.isWaste,
                notes: input.form.notes,
              }
            : {}),
          ...(linkChanged
            ? {
                link: {
                  workOrderId: input.form.workOrderId,
                  workOrderItemId: input.form.workOrderItemId,
                },
              }
            : {}),
        },
      })
    },
    onSuccess: (response, variables) => {
      // Bucket move: on the WO side, cut logs are grouped by WOMI id. A
      // relink (`workOrderItemId` changed) needs to remove the row from
      // the old bucket and add it to the new one. The inv-side publish is
      // a cache-invalidation shim that ignores `workOrderItemId`, so the
      // extra delete is a harmless no-op there.
      const oldWomiId = variables.workOrderItemId
      const newWomiId = response.cutLog.workOrderItemId
      if (oldWomiId !== newWomiId) {
        publish({
          kind: "delete",
          workOrderItemId: oldWomiId,
          cutLogId: response.cutLog.id,
        })
      }
      publish({
        kind: "upsert",
        workOrderItemId: newWomiId,
        cutLog: response.cutLog,
      })
      const next = buildEditForm(response.cutLog)
      setForm(next)
      setBaseline(next)
      setOpen((prev) => ({
        mode: "edit",
        workOrderItemId: newWomiId,
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
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to save cut log" }))
    },
  })
}
