"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"
import { useMutation } from "@tanstack/react-query"
import { isAdjustmentPendingEditable, type InventoryAdjustmentRow } from "@builders/domain"
import {
  updatePendingAdjustmentRequest,
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
 * Update-pending mutation. Stays open on success and refreshes the form +
 * baseline to the server-fresh row. Mutation responses come back as plain
 * `InventoryAdjustmentRow` — the WO/WOMI labels (`workOrderNumber`,
 * `workOrderItemProductLabel`) and the warehouse label (`warehouseName`)
 * are carried forward from the prior snapshot so the panel's read-only
 * cells stay populated. A pending-edit can't change the WO link or the
 * warehouse snapshot, so those labels remain accurate.
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
      workOrderItemId: string | null
      adjustment: InventoryAdjustmentRow
      form: AdjustmentEditForm
    }) => {
      // Mirror the server's gate split: `quantity` is pending-only, so send it
      // only while the row is still PENDING-editable; the metadata trio
      // (`isWaste` / `notes` / `location`) stays editable after finalize and is
      // sent whenever the row isn't QUEUED; the link is sent only when changed.
      const quantityEditable = isAdjustmentPendingEditable(input.adjustment)
      const metaEditable = input.adjustment.status !== "QUEUED"
      const linkChanged =
        input.form.workOrderId !== input.adjustment.workOrderId ||
        input.form.workOrderItemId !== input.adjustment.workOrderItemId
      return updatePendingAdjustmentRequest({
        scope,
        adjustmentId: input.adjustment.id,
        expectedUpdatedAt: input.adjustment.updatedAt,
        patch: {
          ...(quantityEditable ? { quantity: input.form.quantity } : {}),
          ...(metaEditable
            ? {
                isWaste: input.form.isWaste,
                notes: input.form.notes,
                location: input.form.location,
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
      // Bucket move: on the WO side, adjustments are grouped by WOMI id. A
      // relink (`workOrderItemId` changed) needs to remove the row from
      // the old bucket and add it to the new one. The inv-side publish is
      // a cache-invalidation shim that ignores `workOrderItemId`, so the
      // extra delete is a harmless no-op there.
      const oldWomiId = variables.workOrderItemId
      const newWomiId = response.adjustment.workOrderItemId
      if (oldWomiId !== newWomiId) {
        publish({
          kind: "delete",
          reason: "relink-move",
          workOrderItemId: oldWomiId,
          adjustmentId: response.adjustment.id,
        })
      }
      publish({
        kind: "upsert",
        workOrderItemId: newWomiId,
        adjustment: response.adjustment,
      })
      const next = buildEditForm(response.adjustment)
      setForm(next)
      setBaseline(next)
      setOpen((prev) => ({
        mode: "edit",
        pickerConfig: prev?.pickerConfig ?? EDIT_PICKER_CONFIG,
        workOrderItemId: newWomiId,
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
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to save adjustment" }))
    },
  })
}
