"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"
import type { CutLogRow } from "@builders/domain"
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
  setError: Dispatch<SetStateAction<RecordSectionError | null>>
  /**
   * Optional override for post-create routing. When provided, the
   * mutation publishes the patch, fires `onCreated`, and closes the
   * create panel — instead of the default in-place create→edit flip.
   * The WO material-items section uses this to hand the new row off to
   * the inventory hub's cut-log edit panel.
   */
  onCreated?: (cutLog: CutLogRow, workOrderItemId: string) => void
}

/**
 * Create-pending mutation. WO-only — the inventory side never reaches this
 * path because `canCreate` is false there.
 *
 * Default success behavior: transition the panel from create → edit on
 * the newly-created row so the operator can finalize or tweak without
 * reopening. The parent WO label (`workOrderNumber`) and warehouse label
 * (`warehouseName`) are carried forward from the create-mode open spec
 * so the panel's read-only cells stay populated without a reopen.
 * `productName` rides along on the response (snapshot column), so it
 * doesn't need a carry-forward.
 *
 * Override behavior: when `onCreated` is provided, the mutation skips
 * the in-place flip, fires `onCreated`, and closes this panel — leaving
 * the consumer to route the newly-created row wherever it likes.
 */
export function useCreateCutLogMutation({
  scope,
  publish,
  setForm,
  setBaseline,
  setOpen,
  setError,
  onCreated,
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
      if (onCreated) {
        onCreated(response.cutLog, variables.workOrderItemId)
        setOpen(null)
        return
      }
      const next = buildEditForm(response.cutLog)
      setForm(next)
      setBaseline(next)
      setOpen((prev) => ({
        mode: "edit",
        workOrderItemId: variables.workOrderItemId,
        cutLog: {
          ...response.cutLog,
          workOrderNumber:
            prev?.mode === "create" ? (prev.workOrderNumber ?? null) : null,
          warehouseName:
            prev?.mode === "create" ? (prev.warehouseName ?? null) : null,
        },
      }))
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to save cut log" }))
    },
  })
}
