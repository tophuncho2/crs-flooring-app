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
import { buildEditForm } from "../form"
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
      // FINAL rows lock `cut` / `notes` / `isWaste`; only the link is
      // mutable. Send those fields only when the row is still
      // PENDING-editable so the server gate (which separates field
      // patches from link patches) doesn't 409.
      const fieldsEditable = isAdjustmentPendingEditable(input.adjustment)
      const linkChanged =
        input.form.workOrderId !== input.adjustment.workOrderId ||
        input.form.workOrderItemId !== input.adjustment.workOrderItemId
      return updatePendingAdjustmentRequest({
        scope,
        adjustmentId: input.adjustment.id,
        expectedUpdatedAt: input.adjustment.updatedAt,
        patch: {
          ...(fieldsEditable
            ? {
                quantity: input.form.quantity,
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
