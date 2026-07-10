"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"
import { useMutation } from "@tanstack/react-query"
import type { InventoryAdjustmentRow } from "@builders/domain"
import {
  updateAdjustmentRequest,
  type AdjustmentScopeUrl,
} from "@/modules/adjustments/data/mutations"
import { buildEditForm, EDIT_PICKER_CONFIG } from "../form"
import type {
  AdjustmentEditForm,
  AdjustmentEditOpenSpec,
  AdjustmentEditPatch,
} from "../types"

type Deps = {
  scope: AdjustmentScopeUrl
  publish: (patch: AdjustmentEditPatch) => void
  setForm: Dispatch<SetStateAction<AdjustmentEditForm>>
  setBaseline: Dispatch<SetStateAction<AdjustmentEditForm>>
  setOpen: Dispatch<SetStateAction<AdjustmentEditOpenSpec | null>>
  setError: Dispatch<SetStateAction<RecordSectionError | null>>
}

/**
 * Update mutation. Stays open on success and refreshes the form +
 * baseline to the server-fresh row. Mutation responses come back as plain
 * `InventoryAdjustmentRow` — the `workOrderNumber` + `warehouseName` labels are
 * carried forward from the prior snapshot so the panel's read-only cells stay
 * populated.
 */
export function useUpdateAdjustmentMutation({
  scope,
  publish,
  setForm,
  setBaseline,
  setOpen,
  setError,
}: Deps) {
  return useMutation({
    mutationFn: (input: {
      adjustment: InventoryAdjustmentRow
      form: AdjustmentEditForm
    }) => {
      // Every field is freely editable now — send quantity + direction + the
      // metadata trio on every save; the link is sent only when it actually
      // changed. The server re-flows netDeducted + before/after for the whole
      // chain on the write.
      const linkChanged = input.form.workOrderId !== input.adjustment.workOrderId
      return updateAdjustmentRequest({
        scope,
        adjustmentId: input.adjustment.id,
        expectedUpdatedAt: input.adjustment.updatedAt,
        patch: {
          quantity: input.form.quantity,
          adjustmentType: input.form.adjustmentType,
          isWaste: input.form.isWaste,
          internalNotes: input.form.internalNotes,
          color: input.form.color,
          location: input.form.location,
          area: input.form.area,
          ...(linkChanged ? { link: { workOrderId: input.form.workOrderId } } : {}),
        },
      })
    },
    onSuccess: (response) => {
      publish({
        kind: "upsert",
        adjustment: response.adjustment,
      })
      const next = buildEditForm(response.adjustment)
      setForm(next)
      setBaseline(next)
      setOpen((prev) => ({
        mode: "edit",
        pickerConfig: prev?.pickerConfig ?? EDIT_PICKER_CONFIG,
        adjustment: {
          ...response.adjustment,
          workOrderNumber:
            prev?.mode === "edit" ? (prev.adjustment.workOrderNumber ?? null) : null,
          warehouseName:
            prev?.mode === "edit" ? (prev.adjustment.warehouseName ?? null) : null,
        },
      }))
    },
    onError: (err: unknown) => {
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to save adjustment" }))
    },
  })
}
