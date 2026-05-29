"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"
import { useMutation } from "@tanstack/react-query"
import type { InventoryAdjustmentRow } from "@builders/domain"
import {
  finalizeAdjustmentRequest,
  type AdjustmentScopeUrl,
} from "@/modules/adjustments/data/mutations"
import { buildEditForm, EDIT_PICKER_CONFIG } from "../form"
import type {
  AdjustmentEditForm,
  AdjustmentEditPanelOpenSpec,
  AdjustmentPanelPatch,
} from "../types"

type Deps = {
  scope: AdjustmentScopeUrl
  publish: (patch: AdjustmentPanelPatch) => void
  setForm: Dispatch<SetStateAction<AdjustmentEditForm>>
  setBaseline: Dispatch<SetStateAction<AdjustmentEditForm>>
  setOpen: Dispatch<SetStateAction<AdjustmentEditPanelOpenSpec | null>>
  setError: Dispatch<SetStateAction<RecordSectionError | null>>
}

/**
 * Finalize mutation. Stays open on success — the now-FINAL row replaces
 * the prior PENDING row in the panel state and the form/baseline reset
 * to the server-fresh values. The adjustment is no longer pending-editable
 * after this, so the panel's input cells go read-only via
 * `isAdjustmentPendingEditable`. The standard `publish` patch upserts the
 * new row into the parent snapshot. The WO/WOMI + warehouse labels are
 * carried forward from the prior open spec so the read-only cells stay
 * populated (the response is a plain `InventoryAdjustmentRow` with no joined labels).
 */
export function useFinalizeAdjustmentMutation({
  scope,
  publish,
  setForm,
  setBaseline,
  setOpen,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: { workOrderItemId: string | null; adjustment: InventoryAdjustmentRow }) =>
      finalizeAdjustmentRequest({ scope, adjustmentId: input.adjustment.id }),
    onSuccess: (response, variables) => {
      publish({
        kind: "upsert",
        workOrderItemId: variables.workOrderItemId,
        adjustment: response.adjustment,
      })
      const next = buildEditForm(response.adjustment)
      setForm(next)
      setBaseline(next)
      setOpen((prev) => ({
        mode: "edit",
        pickerConfig: prev?.pickerConfig ?? EDIT_PICKER_CONFIG,
        workOrderItemId: variables.workOrderItemId,
        adjustment: {
          ...response.adjustment,
          workOrderNumber:
            prev?.mode === "edit" ? (prev.adjustment.workOrderNumber ?? null) : null,
          workOrderItemProductLabel:
            prev?.mode === "edit"
              ? (prev.adjustment.workOrderItemProductLabel ?? null)
              : null,
          warehouseName:
            prev?.mode === "edit" ? (prev.adjustment.warehouseName ?? null) : null,
        },
      }))
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to finalize adjustment" }))
    },
  })
}
